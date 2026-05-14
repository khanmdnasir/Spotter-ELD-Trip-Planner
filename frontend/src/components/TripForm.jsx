import React, { useState } from "react";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
  background: "white",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

function Field({ label, icon, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        <span style={{ marginRight: 6 }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const EXAMPLES = [
  {
    label: "Dallas → OKC → Denver",
    data: {
      current_location: "Dallas, TX",
      pickup_location: "Oklahoma City, OK",
      dropoff_location: "Denver, CO",
      current_cycle_used: 20,
    },
  },
  {
    label: "Chicago → St. Louis → Memphis",
    data: {
      current_location: "Chicago, IL",
      pickup_location: "St. Louis, MO",
      dropoff_location: "Memphis, TN",
      current_cycle_used: 0,
    },
  },
  {
    label: "Los Angeles → Las Vegas → Phoenix",
    data: {
      current_location: "Los Angeles, CA",
      pickup_location: "Las Vegas, NV",
      dropoff_location: "Phoenix, AZ",
      current_cycle_used: 35,
    },
  },
];

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: 0,
  });
  const [focused, setFocused] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.current_location || !form.pickup_location || !form.dropoff_location) {
      return;
    }
    onSubmit({
      ...form,
      current_cycle_used: parseFloat(form.current_cycle_used) || 0,
    });
  };

  const loadExample = (data) => {
    setForm(data);
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          padding: "16px 20px",
          color: "white",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>Trip Details</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
          Plan your FMCSA HOS-compliant route
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 20 }}>
        {/* Quick examples */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quick examples
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => loadExample(ex.data)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  borderRadius: 20,
                  border: "1.5px solid #d1d5db",
                  background: "var(--gray-50)",
                  color: "#374151",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "#e5e7eb", marginBottom: 16 }} />

        <Field label="Current Location" icon="📍">
          <input
            style={{
              ...inputStyle,
              borderColor: focused === "current" ? "#2563eb" : "#d1d5db",
            }}
            name="current_location"
            value={form.current_location}
            onChange={handleChange}
            onFocus={() => setFocused("current")}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Dallas, TX"
            required
          />
        </Field>

        <Field label="Pickup Location" icon="🟢">
          <input
            style={{
              ...inputStyle,
              borderColor: focused === "pickup" ? "#2563eb" : "#d1d5db",
            }}
            name="pickup_location"
            value={form.pickup_location}
            onChange={handleChange}
            onFocus={() => setFocused("pickup")}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Oklahoma City, OK"
            required
          />
        </Field>

        <Field label="Dropoff Location" icon="🔴">
          <input
            style={{
              ...inputStyle,
              borderColor: focused === "dropoff" ? "#2563eb" : "#d1d5db",
            }}
            name="dropoff_location"
            value={form.dropoff_location}
            onChange={handleChange}
            onFocus={() => setFocused("dropoff")}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Denver, CO"
            required
          />
        </Field>

        <Field label="Current Cycle Used (Hours)" icon="⏱">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min="0"
              max="70"
              step="0.5"
              name="current_cycle_used"
              value={form.current_cycle_used}
              onChange={handleChange}
              style={{ flex: 1 }}
            />
            <div
              style={{
                minWidth: 56,
                padding: "6px 10px",
                background: "#f3f4f6",
                borderRadius: 6,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                color: form.current_cycle_used >= 60 ? "#dc2626" : form.current_cycle_used >= 40 ? "#d97706" : "#16a34a",
              }}
            >
              {Number(form.current_cycle_used).toFixed(1)}h
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {70 - Number(form.current_cycle_used)} hours remaining in 70hr/8-day cycle
          </div>
        </Field>

        {/* HOS assumptions banner */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 16,
            fontSize: 12,
            color: "#1d4ed8",
          }}
        >
          <strong>Assumptions:</strong> 70hr/8-day rule • 11hr driving max/day • 14hr window • 30-min break after 8hr driving • Fuel every 1,000mi • 1hr pickup & dropoff • 55 mph avg speed
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#93c5fd" : "linear-gradient(135deg, #1d4ed8, #2563eb)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 2px 8px rgba(37,99,235,0.4)",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Planning Trip…" : "Plan Trip & Generate ELD Logs"}
        </button>
      </form>
    </div>
  );
}
