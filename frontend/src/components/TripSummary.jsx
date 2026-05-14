import React from "react";

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || "#1e3a5f" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default function TripSummary({ trip, input }) {
  if (!trip) return null;
  const remainingCycle = Math.max(0, 70 - (input.current_cycle_used + trip.total_driving_hours));

  return (
    <div
      style={{
        marginTop: 16,
        background: "white",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #064e3b, #059669)",
          padding: "12px 16px",
          color: "white",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Trip Summary
      </div>
      <div
        style={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        <Stat
          label="Total Distance"
          value={`${Math.round(trip.total_distance_miles)} mi`}
        />
        <Stat
          label="Driving Hours"
          value={`${trip.total_driving_hours.toFixed(1)} hrs`}
          color="#2563eb"
        />
        <Stat
          label="Total Trip Time"
          value={`${trip.total_trip_hours.toFixed(1)} hrs`}
          color="#d97706"
        />
        <Stat
          label="Days on Road"
          value={`${trip.estimated_days} day${trip.estimated_days !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Log sheets count */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#374151" }}>
          📋 <strong>{trip.daily_logs.length}</strong> ELD log sheet{trip.daily_logs.length !== 1 ? "s" : ""} generated
        </span>
        <span style={{ color: remainingCycle < 10 ? "#dc2626" : "#059669", fontWeight: 600 }}>
          {remainingCycle.toFixed(1)}h cycle remaining
        </span>
      </div>
    </div>
  );
}
