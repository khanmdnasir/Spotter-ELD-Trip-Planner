import React, { useState } from "react";
import TripForm from "./components/TripForm";
import RouteMap from "./components/RouteMap";
import ELDLogSheet from "./components/ELDLogSheet";
import TripSummary from "./components/TripSummary";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("map");

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await axios.post(`${API_BASE}/trip/`, formData);
      setResult(resp.data);
      setActiveTab("map");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
      {/* Header */}
      <header
        style={{
          background: "#1e3a5f",
          color: "white",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 64,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#2563eb" />
            <path d="M4 20 L12 12 L18 18 L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="10" r="2.5" fill="#60a5fa"/>
          </svg>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
              Spotter
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: -2 }}>
              ELD Trip Planner
            </div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
          FMCSA HOS • 70hr/8-day • Property Carrier
        </div>
      </header>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 16px",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left panel – form */}
        <div>
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 14,
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}
          {result && <TripSummary trip={result.trip} input={result.input} />}
        </div>

        {/* Right panel – results */}
        {result ? (
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {["map", "logs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    background: activeTab === tab ? "#1e3a5f" : "white",
                    color: activeTab === tab ? "white" : "#374151",
                    boxShadow: "var(--shadow)",
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "map" ? "🗺 Route Map" : "📋 ELD Log Sheets"}
                </button>
              ))}
            </div>

            {activeTab === "map" && (
              <RouteMap result={result} />
            )}
            {activeTab === "logs" && (
              <ELDLogSheet
                dailyLogs={result.trip.daily_logs}
                input={result.input}
              />
            )}
          </div>
        ) : (
          !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 480,
                background: "white",
                borderRadius: 12,
                boxShadow: "var(--shadow)",
                color: "#9ca3af",
              }}
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ marginBottom: 20 }}>
                <circle cx="40" cy="40" r="38" fill="#f3f4f6" />
                <path d="M20 50 Q30 25 40 35 Q50 45 60 20" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <circle cx="20" cy="50" r="4" fill="#9ca3af"/>
                <circle cx="60" cy="20" r="4" fill="#9ca3af"/>
              </svg>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>
                Enter trip details to plan your route
              </div>
              <div style={{ fontSize: 13, marginTop: 6, textAlign: "center", maxWidth: 280 }}>
                Fill in the form on the left to generate your route map and HOS-compliant ELD log sheets.
              </div>
            </div>
          )
        )}
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 480,
              background: "white",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="spinner" style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "4px solid #e5e7eb",
              borderTopColor: "#2563eb",
              animation: "spin 0.9s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ marginTop: 16, fontSize: 15, color: "#374151", fontWeight: 600 }}>
              Planning your trip…
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              Geocoding locations & calculating HOS schedule
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
