// src/App.js
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  query,
  orderBy
} from "firebase/firestore";

export default function App() {
  const [gifts, setGifts] = useState([]);
  const [staged, setStaged] = useState({});
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  // Crear/recuperar userId
  useEffect(() => {
    let uid = localStorage.getItem("userId");
    if (!uid) {
      if (window.crypto && crypto.randomUUID) uid = crypto.randomUUID();
      else uid = "u_" + Math.random().toString(36).slice(2, 9);
      localStorage.setItem("userId", uid);
    }
    setUserId(uid);
  }, []);

  // Escuchar regalos
  useEffect(() => {
    const col = collection(db, "gifts");
    const q = query(col, orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setGifts(arr);
    });
    return () => unsub();
  }, []);

  const getChecked = (id, gift) => {
    if (staged.hasOwnProperty(id)) return !!staged[id];
    return !!(gift && gift.reserved);
  };

  const toggleLocal = (id, gift) => {
    if (gift && gift.reserved && gift.reservedBy && gift.reservedBy !== userId) {
      alert("Este regalo ya fue seleccionado por otra persona.");
      return;
    }
    setStaged((s) => {
      const current = s.hasOwnProperty(id) ? !!s[id] : !!(gift && gift.reserved);
      return { ...s, [id]: !current };
    });
  };

  const handleSave = async () => {
    const ids = Object.keys(staged);
    if (ids.length === 0) {
      return;
    }

    setLoading(true); // 👈 Mostrar "Guardando..."

    const conflicts = [];
    for (const id of ids) {
      const wantReserve = !!staged[id];
      const ref = doc(db, "gifts", id);

      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          const data = snap.exists() ? snap.data() : {};
          const currentlyReserved = !!data.reserved;
          const currentOwner = data.reservedBy || null;

          if (wantReserve) {
            if (!currentlyReserved) {
              tx.set(ref, { reserved: true, reservedBy: userId }, { merge: true });
            } else if (currentOwner === userId) {
              tx.set(ref, { reserved: true, reservedBy: userId }, { merge: true });
            } else {
              throw new Error("conflict");
            }
          } else {
            if (currentlyReserved && currentOwner === userId) {
              tx.set(ref, { reserved: false, reservedBy: null }, { merge: true });
            }
          }
        });
      } catch (err) {
        conflicts.push(id);
      }
    }

    setStaged({});
    setLoading(false);

    if (conflicts.length > 0) {
      alert("Algunos regalos ya fueron tomados por otras personas: " + conflicts.join(", "));
    } else {
      // Redirigir a página nueva en blanco con mensaje en el centro
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Gracias</title>
              <style>
                body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#fff; }
                h1 { font-family: 'Brush Script MT', cursive; color:#064420; text-align:center; }
              </style>
            </head>
            <body>
              <h1>¡Gracias por acompañarnos en este día tan especial! 💚</h1>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFF0E1", width: "100%", padding: 20 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", fontFamily: "Brush Script MT, cursive", fontSize: 50, color: "#064420" }}>
          Lista de regalos
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
          {(() => {
            const bySection = {};
            gifts.forEach((g) => {
              const sec = g.section || "General";
              bySection[sec] = bySection[sec] || [];
              bySection[sec].push(g);
            });

            return Object.entries(bySection).map(([sectionName, items]) => (
              <div key={sectionName} style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.06)", marginBottom: 12 }}>
                <h2 style={{ fontFamily: "Brush Script MT, cursive", color: "#064420", marginTop: 0 }}>{sectionName}</h2>
                <hr style={{ border: "1px solid #064420", marginBottom: 10 }} />

                {items.map((gift) => {
                  const checked = getChecked(gift.id, gift);
                  const reservedBy = gift.reservedBy || null;
                  const disabled = gift.reserved && reservedBy && reservedBy !== userId;

                  return (
                    <div key={gift.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleLocal(gift.id, gift)}
                          style={{ width: 20, height: 20 }}
                        />
                        <span style={{
                          textDecoration: checked ? "line-through" : "none",
                          color: "#064420"
                        }}>
                          {gift.name}
                        </span>
                      </label>

                      <div style={{ width: 120, textAlign: "right" }}>
                        {checked && (
                          <span style={{ color: "green", fontWeight: 700 }}>
                            {gift.reserved && gift.reservedBy === userId ? "Reservado (tú)" : "Reservado"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>

        {/* Cuentas */}
        <div style={{ marginTop: 20, background: "#fff", padding: 14, borderRadius: 12 }}>
          <div style={{ fontWeight: 700, color: "#064420" }}>Si deseas dejarnos un presente en efectivo:</div>
          <div style={{ marginTop: 6, color: "#064420" }}>BCP Soles:21503250692023</div>
          <div style={{ marginTop: 6, color: "#064420" }}>Interbancaria:00221510325069202322</div>
        </div>

        {/* Direcciones */}
        <div style={{ marginTop: 20, background: "#fff", padding: 14, borderRadius: 12 }}>
          <div style={{ color: "#064420" }}>
            Los presentes pueden enviarlos a las siguientes direcciones: <br />
            -Calle Alto de la Alianza 503-A, Miguel Grau, Paucarpata <br />
            -Calle Jorge Chávez 304, Bellapampa, Socabaya <br />
            ¡Muchas gracias por su detalle!
          </div>
        </div>

        {/* Botón */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={handleSave} style={{ background: "#064420", color: "#fff", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 700 }}>
            Guardar
          </button>
        </div>
      </div>

      {/* Modal de cargando */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, textAlign: "center" }}>
            <div className="spinner" style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #064420",
              borderRadius: "50%",
              width: 40,
              height: 40,
              margin: "0 auto 12px",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ color: "#064420", fontWeight: 700 }}>Guardando...</p>
          </div>
        </div>
      )}

      {/* Animación del spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

