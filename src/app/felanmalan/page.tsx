"use client";

import { useState, useEffect, useRef } from "react";

interface Property {
  name: string;
  address: string;
}

const FAULT_TYPES = [
  "El",
  "Hiss/Portar/Dörrar",
  "Mark/Tak/Fasad",
  "Vatten/Avlopp",
  "Vitvaror",
  "Värme/Kyla/Ventilation",
  "Övrigt",
];

export default function FelanmalanPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<Property[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isResident, setIsResident] = useState(false);
  const [company, setCompany] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [faultType, setFaultType] = useState("");
  const [fileName, setFileName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/properties/public")
      .then((r) => r.json())
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function filterSuggestions(value: string) {
    const q = value.toLowerCase();
    const filtered = q
      ? properties.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q),
        )
      : properties;
    setSuggestions(filtered);
    setSuggestionsOpen(filtered.length > 0);
  }

  function handleAddressInput(value: string) {
    setAddress(value);
    filterSuggestions(value);
  }

  function selectSuggestion(p: Property) {
    setAddress(`${p.name} — ${p.address}`);
    setSuggestionsOpen(false);
  }

  function handleResidentToggle(checked: boolean) {
    setIsResident(checked);
    if (checked) setCompany("Bostadshyresgäst");
    else if (company === "Bostadshyresgäst") setCompany("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          address,
          company,
          shortDescription: shortDesc,
          longDescription: longDesc,
          faultType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Något gick fel. Försök igen.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Kunde inte nå servern. Kontrollera din internetanslutning.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "#fff3ee", minHeight: "100vh" }}>
      <div style={{ padding: "26px 42px 80px" }} className="max-sm:p-0">
        <main
          style={{ background: "#fff", width: "100%", minHeight: "calc(100vh - 52px)", padding: "126px 116px 120px" }}
          className="max-sm:!px-6 max-sm:!pt-12 max-sm:!pb-16"
        >
          <div style={{ maxWidth: 1480, margin: "0 auto" }}>
            {/* Header */}
            <div className="mb-16 flex flex-wrap items-start justify-between gap-6 max-sm:mb-12 max-sm:block">
              <div>
                <h1
                  style={{ fontSize: 43, fontWeight: 700, letterSpacing: "-0.9px", lineHeight: 1.08, margin: "0 0 22px" }}
                  className="max-sm:!text-[34px]"
                >
                  Registrera felanmälan
                </h1>
                <p style={{ fontSize: 24, lineHeight: 1.35, margin: 0 }} className="max-sm:!text-xl">
                  Vid <strong>AKUT*</strong> service: välj adress och ring visat telefonnummer!
                  <br />
                  <em>*Akut service innebär risk för skador på person eller fastighet/egendom.</em>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Section 1 — Felbeskrivning */}
              <section style={{ borderTop: "1px solid #f0f2f4", paddingTop: 30 }}>
                <h2
                  style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 26px" }}
                  className="max-sm:!text-[28px]"
                >
                  Felbeskrivning
                </h2>
                <p style={{ fontSize: 24, fontStyle: "italic", margin: "0 0 61px" }} className="max-sm:!text-xl">
                  * = Obligatorisk uppgift
                </p>

                {/* Adress */}
                <div style={{ marginBottom: 24, position: "relative" }}>
                  <label htmlFor="address" style={labelStyle}>Sök adress *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => filterSuggestions(address)}
                      onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                      placeholder="Skriv in en adress"
                      required
                      style={inputStyle}
                    />
                    {suggestionsOpen && (
                      <div style={suggestionsStyle}>
                        {suggestions.map((p, i) => (
                          <div
                            key={i}
                            onMouseDown={() => selectSuggestion(p)}
                            style={suggestionItemStyle}
                            className="hover:bg-[#f4f5f6]"
                          >
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                            {p.address && (
                              <span style={{ color: "#68727d" }}> — {p.address}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bostadshyresgäst */}
                <div style={{ marginBottom: 28 }}>
                  <span style={labelStyle}>Bostadshyresgäst</span>
                  <input
                    id="resident"
                    type="checkbox"
                    checked={isResident}
                    onChange={(e) => handleResidentToggle(e.target.checked)}
                    style={{ width: 18, height: 18, margin: 0, accentColor: "#0078ff", cursor: "pointer" }}
                    aria-label="Bostadshyresgäst"
                  />
                </div>

                {/* Företag */}
                <div style={{ marginBottom: 24, position: "relative" }}>
                  <label htmlFor="company" style={labelStyle}>Företag *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      readOnly={isResident}
                      required
                      style={{
                        ...inputStyle,
                        ...(isResident
                          ? { borderColor: "#188353", borderWidth: 2, background: "#eef0f2", paddingRight: 70 }
                          : {}),
                      }}
                    />
                    {isResident && (
                      <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "#188353", fontSize: 36, fontWeight: 700, pointerEvents: "none", lineHeight: 1 }}>
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Kort beskrivning */}
                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="shortDesc" style={labelStyle}>Kort beskrivning *</label>
                  <input
                    id="shortDesc"
                    type="text"
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value.slice(0, 40))}
                    maxLength={40}
                    required
                    style={inputStyle}
                  />
                  <div style={counterStyle}>
                    {shortDesc.length > 0 ? `${shortDesc.length} av 40 tecken` : "av 40 tecken"}
                  </div>
                </div>

                {/* Utförlig beskrivning */}
                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="longDesc" style={labelStyle}>Utförlig beskrivning</label>
                  <textarea
                    id="longDesc"
                    value={longDesc}
                    onChange={(e) => setLongDesc(e.target.value.slice(0, 5000))}
                    maxLength={5000}
                    style={{ ...inputStyle, minHeight: 137, resize: "vertical", padding: "14px 18px", height: "auto" }}
                  />
                  <div style={counterStyle}>
                    {longDesc.length > 0 ? `${longDesc.length} av 5000 tecken` : "av 5000 tecken"}
                  </div>
                </div>

                {/* Typ av fel */}
                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="faultType" style={labelStyle}>Typ av fel *</label>
                  <select
                    id="faultType"
                    value={faultType}
                    onChange={(e) => setFaultType(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">Välj typ av fel</option>
                    {FAULT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Bifoga filer */}
                <div style={{ marginBottom: 24 }}>
                  <span style={labelStyle}>Bifoga filer</span>
                  <label
                    htmlFor="files"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 105, height: 59, padding: "0 20px", border: "1.5px solid #fde0d5", borderRadius: 5, color: "#c0886a", background: "#fff", fontSize: 24, cursor: "pointer" }}
                    className="hover:border-[#ffd1bf] hover:text-[#edb4a0]"
                  >
                    Välj fil
                  </label>
                  <input
                    id="files"
                    ref={fileRef}
                    type="file"
                    multiple
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setFileName(files.length === 0 ? "" : files.length === 1 ? files[0].name : `${files.length} filer valda`);
                    }}
                  />
                  {fileName && <div style={{ color: "#68727d", fontSize: 18, marginTop: 10 }}>{fileName}</div>}
                </div>
              </section>

              {/* Section 2 — Kontaktuppgifter */}
              <section style={{ borderTop: "1px solid #f0f2f4", paddingTop: 33, marginTop: 84 }}>
                <h2
                  style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 26px" }}
                  className="max-sm:!text-[28px]"
                >
                  Kontaktuppgifter
                </h2>

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="firstName" style={labelStyle}>Förnamn *</label>
                  <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="lastName" style={labelStyle}>Efternamn *</label>
                  <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="phone" style={labelStyle}>Telefonnummer (endast siffror) *</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9 ]+"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="email" style={labelStyle}>E-postadress *</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                </div>

                <p style={{ margin: "37px 0", fontSize: 34, lineHeight: 1.32, fontWeight: 700, letterSpacing: "-0.3px", maxWidth: 1700 }} className="max-sm:!text-[25px]">
                  När du registrerar din felanmälan kommer du få ett bekräftelsemejl samt fortlöpande mejl med uppdateringar för var din felanmälan är i processen till ovan angiven e-postadress.
                </p>

                {error && (
                  <div style={{ marginBottom: 20, padding: "14px 18px", border: "1.5px solid #f5a0a0", borderRadius: 5, color: "#c0392b", background: "#fff5f5", fontSize: 20 }}>
                    {error}
                  </div>
                )}

                {submitted ? (
                  <div style={{ padding: "18px 20px", border: "1.5px solid #188353", color: "#188353", borderRadius: 5, fontSize: 22, background: "#f5fbf7" }}>
                    ✓ Felanmälan är registrerad. Du får ett bekräftelsemejl med uppdateringar.
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ display: "inline-flex", alignItems: "center", gap: 10, border: 0, borderRadius: 6, background: submitting ? "#f0a060" : "#ff7826", color: "#fff", fontFamily: "inherit", fontSize: 32, lineHeight: 1, padding: "22px 27px", cursor: submitting ? "not-allowed" : "pointer" }}
                    className="max-sm:!text-[27px] max-sm:!px-5 max-sm:!py-4"
                  >
                    <span style={{ width: 34, height: 34, border: "3px solid #fff", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
                      ✓
                    </span>
                    {submitting ? "Registrerar…" : "Registrera"}
                  </button>
                )}
              </section>
            </form>
          </div>
        </main>
      </div>

      <style>{`
        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="tel"]:focus,
        select:focus,
        textarea:focus {
          border-color: #ff7826 !important;
          box-shadow: 0 0 0 2px rgba(255, 120, 38, 0.18) !important;
          outline: none;
        }
        @media (max-width: 640px) {
          main { padding: 46px 22px 70px !important; }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #cfd8e3",
  borderRadius: 5,
  background: "#fff",
  color: "#24282d",
  fontFamily: "inherit",
  fontSize: 24,
  outline: "none",
  transition: "border-color 120ms ease, box-shadow 120ms ease",
  height: 56,
  padding: "0 18px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 24,
  lineHeight: 1.25,
  marginBottom: 12,
  fontWeight: 400,
};

const counterStyle: React.CSSProperties = {
  color: "#68727d",
  fontSize: 18,
  marginTop: 4,
};

const suggestionsStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 10,
  left: 0,
  right: 0,
  top: "calc(100% + 4px)",
  background: "#fff",
  border: "1px solid #cfd8e3",
  borderRadius: 5,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  maxHeight: 280,
  overflowY: "auto",
};

const suggestionItemStyle: React.CSSProperties = {
  padding: "14px 18px",
  fontSize: 20,
  cursor: "pointer",
};
