import { useState, useEffect } from "react";

function App() {
  // Parse simple URL routing: /scan/:kit/:id
  const path = window.location.pathname;
  const scanMatch = path.match(/^\/scan\/([^/]+)\/([^/]+)/);
  const isScanning = !!scanMatch;
  const scanKit = scanMatch ? scanMatch[1] : null;
  const scanId = scanMatch ? scanMatch[2] : null;

  // State for QR Generator (original flow)
  const [kit, setKit] = useState("KIT1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // State for QR Scanner (new flow)
  const [scanLoading, setScanLoading] = useState(true);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);

  // Scan Code Effect
  useEffect(() => {
    if (!isScanning || !scanId) return;

    async function performScan() {
      try {
        setScanLoading(true);
        setScanError("");
        const response = await fetch(`/api/codigos/${scanId}/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("El código QR escaneado no existe o no es válido.");
          }
          const message = await response.text();
          throw new Error(message || "Error al registrar el escaneo.");
        }

        const data = await response.json();
        setScanResult(data);
      } catch (err) {
        setScanError(err.message || "Error de conexión con el servidor.");
      } finally {
        setScanLoading(false);
      }
    }

    performScan();
  }, [isScanning, scanId]);

  // Handle Create Code (original flow)
  async function handleCreateCode() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/codigos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kit }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "No se pudo crear el codigo");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // View 1: Scanning Flow
  if (isScanning) {
    return (
      <div className="app scan-page">
        <main className="card scan-card">
          <div className="img-container animate-fade-in">
            <img src="/qr_header_badge.png" alt="Verification" className="header-image" />
          </div>

          {scanLoading && (
            <div className="status-container loading">
              <div className="spinner"></div>
              <p className="status-msg">Verificando estado del código...</p>
            </div>
          )}

          {scanError && (
            <div className="status-container error-state animate-scale-up">
              <div className="badge-status error-badge">✕</div>
              <h2 className="status-title error-text">Error de Verificación</h2>
              <p className="status-desc">{scanError}</p>
            </div>
          )}

          {scanResult && (
            <div
              className={`status-container animate-scale-up ${
                scanResult.registrado_previo ? "already-registered" : "success"
              }`}
            >
              {!scanResult.registrado_previo ? (
                <>
                  <div className="badge-status success-badge">✓</div>
                  <h2 className="status-title success-text">Registro Exitoso</h2>
                  <p className="status-desc text-green">El código ha sido registrado correctamente.</p>
                </>
              ) : (
                <>
                  <div className="badge-status danger-badge">!</div>
                  <h2 className="status-title danger-text">Registrado</h2>
                  <p className="status-desc text-red">Este código QR ya fue verificado anteriormente.</p>
                </>
              )}

              <div className="info-box">
                <div className="info-row">
                  <span className="info-label">Kit</span>
                  <span className="info-value kit-highlight">{scanKit}</span>
                </div>
                <div className="info-row border-top">
                  <span className="info-label">Código ID</span>
                  <span className="info-value code-highlight">{scanId}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // View 2: QR Generator Flow (Original)
  return (
    <div className="app">
      <main className="card">
        <h1>QR Kit Generator</h1>
        <p className="subtitle">Selecciona un kit y genera un codigo QR unico</p>

        <section className="kit-selector">
          <label className="kit-option">
            <input
              type="radio"
              name="kit"
              value="KIT1"
              checked={kit === "KIT1"}
              onChange={(e) => setKit(e.target.value)}
            />
            <span>KIT1</span>
          </label>
          <label className="kit-option">
            <input
              type="radio"
              name="kit"
              value="KIT2"
              checked={kit === "KIT2"}
              onChange={(e) => setKit(e.target.value)}
            />
            <span>KIT2</span>
          </label>
        </section>

        <button className="create-button" onClick={handleCreateCode} disabled={loading}>
          {loading ? "Creando..." : "Crear codigo"}
        </button>

        {error && <p className="error">{error}</p>}

        {result && (
          <section className="result animate-scale-up">
            <img src={result.qr_image} alt={`QR code for ${kit}`} />
            <p className="label">ID unico</p>
            <p className="value">{result.id}</p>
            <p className="label">URL del codigo</p>
            <p className="value url">{result.url}</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
