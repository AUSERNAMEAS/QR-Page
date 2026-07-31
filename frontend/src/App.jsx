import { useState, useEffect } from "react";
import kit1Template from "./images/kit1_template.jpg";
import kit2Template from "./images/kit2_template.jpg";
import logoImg from "./images/logo.jpg";

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
  const [ticketDataUrl, setTicketDataUrl] = useState(null);
  const [combining, setCombining] = useState(false);

  // Password / Admin Token state
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");

  // State for QR Scanner (new flow)
  const [scanLoading, setScanLoading] = useState(true);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);

  const isGeneratorRoute = path === "/generadorDeQr3s";

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
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ kit }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAdminToken(""); // Clear the incorrect token
          throw new Error("Contraseña incorrecta. Por favor, intente de nuevo.");
        }
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

  // Effect to generate combined ticket image (Template + QR)
  useEffect(() => {
    if (!result) {
      setTicketDataUrl(null);
      return;
    }

    setCombining(true);
    const canvas = document.createElement("canvas");
    canvas.width = 826;
    canvas.height = 1299;
    const ctx = canvas.getContext("2d");

    const templateImg = new Image();
    templateImg.src = kit === "KIT1" ? kit1Template : kit2Template;
    
    templateImg.onload = () => {
      // Draw template
      ctx.drawImage(templateImg, 0, 0, 826, 1299);

      // Draw QR code
      const qrImg = new Image();
      qrImg.src = result.qr_image;
      qrImg.onload = () => {
        // Draw QR at X=70, Y=266, Size=673x673 to fill the central placeholder
        ctx.drawImage(qrImg, 70, 266, 673, 673);
        
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          setTicketDataUrl(dataUrl);
        } catch (e) {
          console.error("Failed to generate ticket image:", e);
        } finally {
          setCombining(false);
        }
      };
      qrImg.onerror = () => {
        console.error("Failed to load QR image for ticket.");
        setCombining(false);
      };
    };
    templateImg.onerror = () => {
      console.error("Failed to load template image.");
      setCombining(false);
    };
  }, [result, kit]);

  const handleDownload = () => {
    if (!ticketDataUrl) return;
    const link = document.createElement("a");
    link.href = ticketDataUrl;
    link.download = `ticket_${kit}_${result.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // View 1: Scanning Flow
  if (isScanning) {
    return (
      <div className="app scan-page">
        <main className="card scan-card">
          <div className="img-container animate-fade-in">
            <img src={logoImg} alt="Verification" className="header-image" />
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

  // View 2: QR Generator Flow (Admin Route)
  if (isGeneratorRoute) {
    if (!adminToken) {
      return (
        <div className="app">
          <main className="card">
            <h1>Acceso Administrador</h1>
            <p className="subtitle">Introduce la contraseña para generar códigos QR</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAdminToken(tokenInput);
              }}
              style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}
            >
              <input
                type="password"
                placeholder="Contraseña"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{
                  padding: "0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "1rem",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-color)"
                }}
              />
              <button type="submit" className="create-button" style={{ width: "100%" }}>
                Continuar
              </button>
            </form>
            {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}
          </main>
        </div>
      );
    }

    return (
      <div className="app">
        <main className="card">
          <h1>Generador de QR</h1>
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
              <div className="ticket-preview-wrapper">
                {combining ? (
                  <div className="combining-loader">
                    <div className="spinner"></div>
                    <p>Generando ticket...</p>
                  </div>
                ) : ticketDataUrl ? (
                  <div className="ticket-card-container">
                    <img src={ticketDataUrl} alt={`Ticket for ${kit}`} className="ticket-preview-img" />
                    <button className="download-button" onClick={handleDownload}>
                      <span className="download-icon">📥</span> Descargar Ticket
                    </button>
                  </div>
                ) : (
                  <img src={result.qr_image} alt={`QR code for ${kit}`} />
                )}
              </div>
              
              <p className="label">ID único</p>
              <p className="value">{result.id}</p>
              <p className="label">URL del código</p>
              <p className="value url">{result.url}</p>
            </section>
          )}
        </main>
      </div>
    );
  }

  // View 3: Default/Root landing page
  return (
    <div className="app scan-page">
      <main className="card scan-card">
        <div className="img-container animate-fade-in">
          <img src={logoImg} alt="Verification" className="header-image" />
        </div>
        <div className="status-container loading" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h2 className="status-title" style={{ color: "var(--text-color)", fontSize: "1.5rem" }}>Sistema de Accesos</h2>
          <p className="status-desc" style={{ color: "#666", fontSize: "0.95rem", lineHeight: "1.4" }}>
            Por favor, escanee un código QR válido para validar su ingreso.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
