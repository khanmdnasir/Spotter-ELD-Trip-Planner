import React, { useRef, useEffect, useState } from "react";

const STATUS_ROW = {
  OFF_DUTY: 0,
  SLEEPER_BERTH: 1,
  DRIVING: 2,
  ON_DUTY_NOT_DRIVING: 3,
};

const STATUS_LABELS = ["Off Duty", "Sleeper Berth", "Driving", "On Duty\n(Not Driving)"];

const STATUS_COLORS = {
  OFF_DUTY: "#6b7280",
  SLEEPER_BERTH: "#7c3aed",
  DRIVING: "#2563eb",
  ON_DUTY_NOT_DRIVING: "#d97706",
};

// Layout constants (pixels)
const MARGIN = { top: 160, left: 130, right: 20, bottom: 80 };
const GRID_W = 960;
const ROW_H = 48;
const GRID_H = ROW_H * 4;
const CANVAS_W = MARGIN.left + GRID_W + MARGIN.right;
const CANVAS_H = MARGIN.top + GRID_H + MARGIN.bottom;

function drawLogSheet(canvas, dayLog, input, dayIndex, totalDays) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const today = new Date();
  today.setDate(today.getDate() + dayIndex);
  const dateStr = today.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Header block ────────────────────────────────────────────
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(0, 0, canvas.width, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px Arial";
  ctx.fillText("U.S. DEPARTMENT OF TRANSPORTATION — DRIVER'S DAILY LOG", 16, 26);
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Sheet ${dayIndex + 1} of ${totalDays}`, canvas.width - 16, 26);
  ctx.textAlign = "left";

  // ── Header info fields ───────────────────────────────────────
  const headerY = 48;
  const fields = [
    ["Date", dateStr],
    ["Driver", "Driver Name"],
    ["Co-Driver", "—"],
    ["Carrier", "Spotter Logistics"],
    ["Main Office", "Washington, D.C."],
    ["From", input.current_location],
    ["Pickup", input.pickup_location],
    ["Dropoff", input.dropoff_location],
    ["Vehicle #", "CMV-0001"],
    ["Total Miles Today", `${dayLog.total_miles} mi`],
  ];

  ctx.font = "10px Arial";
  const colW = (canvas.width - 32) / 5;
  fields.forEach((f, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 16 + col * colW;
    const y = headerY + row * 36;
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(x, y, colW - 4, 30);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, colW - 4, 30);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "9px Arial";
    ctx.fillText(f[0], x + 4, y + 10);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 11px Arial";
    ctx.fillText(f[1], x + 4, y + 24);
  });

  // ── Grid section ─────────────────────────────────────────────
  const gx = MARGIN.left;
  const gy = MARGIN.top;

  // Row labels
  STATUS_LABELS.forEach((label, i) => {
    const y = gy + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? "#f9fafb" : "#f0f4f8";
    ctx.fillRect(0, y, gx - 1, ROW_H);
    ctx.fillStyle = "#374151";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    // Handle multiline label
    const lines = label.split("\n");
    lines.forEach((line, li) => {
      ctx.fillText(line, gx / 2, y + ROW_H / 2 - (lines.length - 1) * 6 + li * 12);
    });
    ctx.textAlign = "left";
  });

  // Grid background rows
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(gx, gy + i * ROW_H, GRID_W, ROW_H);
  }

  // Vertical hour lines
  for (let h = 0; h <= 24; h++) {
    const x = gx + (h / 24) * GRID_W;
    ctx.beginPath();
    ctx.strokeStyle = h === 0 || h === 24 ? "#374151" : h % 6 === 0 ? "#9ca3af" : "#e5e7eb";
    ctx.lineWidth = h === 0 || h === 24 ? 1.5 : h % 6 === 0 ? 0.8 : 0.4;
    ctx.moveTo(x, gy - 18);
    ctx.lineTo(x, gy + GRID_H);
    ctx.stroke();

    // Half-hour tick
    if (h < 24) {
      const hx = gx + ((h + 0.5) / 24) * GRID_W;
      ctx.beginPath();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.3;
      ctx.moveTo(hx, gy - 8);
      ctx.lineTo(hx, gy + GRID_H);
      ctx.stroke();
    }
  }

  // Horizontal row lines
  for (let i = 0; i <= 4; i++) {
    const y = gy + i * ROW_H;
    ctx.beginPath();
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = i === 0 || i === 4 ? 1.5 : 0.8;
    ctx.moveTo(0, y);
    ctx.lineTo(gx + GRID_W, y);
    ctx.stroke();
  }

  // Hour labels above grid
  const hourLabels = ["M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "N", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "M"];
  ctx.font = "bold 9px Arial";
  ctx.fillStyle = "#374151";
  ctx.textAlign = "center";
  hourLabels.forEach((label, h) => {
    const x = gx + (h / 24) * GRID_W;
    ctx.fillText(label, x, gy - 5);
  });
  ctx.textAlign = "left";

  // ── Draw duty status lines ────────────────────────────────────
  (dayLog.events || []).forEach((evt) => {
    const row = STATUS_ROW[evt.status];
    if (row === undefined) return;
    const x1 = gx + (evt.start / 24) * GRID_W;
    const x2 = gx + (evt.end / 24) * GRID_W;
    const y = gy + row * ROW_H + ROW_H / 2;
    const color = STATUS_COLORS[evt.status] || "#374151";

    // Filled bar
    ctx.fillStyle = color + "22";
    ctx.fillRect(x1, gy + row * ROW_H + 4, x2 - x1, ROW_H - 8);

    // Center line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "square";
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Vertical connector at start
    if (row > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.moveTo(x1, gy);
      ctx.lineTo(x1, gy + row * ROW_H + ROW_H / 2);
      ctx.stroke();
    }
  });

  // ── Total hours column ───────────────────────────────────────
  const totals = dayLog.totals || {};
  const statusKeys = ["OFF_DUTY", "SLEEPER_BERTH", "DRIVING", "ON_DUTY_NOT_DRIVING"];
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  statusKeys.forEach((key, i) => {
    const val = totals[key] || 0;
    const y = gy + i * ROW_H + ROW_H / 2 + 4;
    const x = gx + GRID_W + 50;
    ctx.fillStyle = STATUS_COLORS[key];
    ctx.fillText(val.toFixed(2), x, y);
  });
  ctx.font = "9px Arial";
  ctx.fillStyle = "#374151";
  ctx.fillText("TOTAL HRS", gx + GRID_W + 50, gy - 5);
  ctx.textAlign = "left";

  // Total = 24 check
  const sumTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  ctx.font = "10px Arial";
  ctx.fillStyle = Math.abs(sumTotal - 24) < 0.5 ? "#16a34a" : "#dc2626";
  ctx.textAlign = "center";
  ctx.fillText(`= ${sumTotal.toFixed(2)}`, gx + GRID_W + 50, gy + GRID_H + 16);
  ctx.textAlign = "left";

  // ── Remarks section ──────────────────────────────────────────
  const remarkY = gy + GRID_H + 8;
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(0, remarkY, canvas.width, 18);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 9px Arial";
  ctx.fillText("REMARKS — List city/town and state at each duty status change", 8, remarkY + 12);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#1f2937";
  const remarks = dayLog.remarks || [];
  remarks.forEach((r, i) => {
    const col = i % 2;
    const row2 = Math.floor(i / 2);
    const rx = 16 + col * (canvas.width / 2 - 16);
    const ry = remarkY + 28 + row2 * 16;
    if (ry < canvas.height - 8) {
      ctx.fillText(`${r.time}  ${r.location}${r.notes ? " — " + r.notes : ""}`, rx, ry);
    }
  });

  // ── Signature line ───────────────────────────────────────────
  const sigY = canvas.height - 24;
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(16, sigY);
  ctx.lineTo(300, sigY);
  ctx.stroke();
  ctx.font = "9px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Driver Signature (certifies entries are true and correct)", 16, sigY + 10);

  // Date line
  ctx.beginPath();
  ctx.moveTo(canvas.width - 180, sigY);
  ctx.lineTo(canvas.width - 20, sigY);
  ctx.stroke();
  ctx.fillText("Date", canvas.width - 180, sigY + 10);
}

function LogCanvas({ dayLog, input, dayIndex, totalDays }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && dayLog) {
      drawLogSheet(canvasRef.current, dayLog, input, dayIndex, totalDays);
    }
  }, [dayLog, input, dayIndex, totalDays]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `eld-log-day-${dayIndex + 1}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const totals = dayLog.totals || {};

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      {/* Log header bar */}
      <div
        style={{
          padding: "10px 16px",
          background: "#1e3a5f",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Day {dayIndex + 1} ELD Log
          </span>
          <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 12 }}>
            {dayLog.total_miles} mi driven
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Status pills */}
          {Object.entries(totals).map(([key, val]) =>
            val > 0 ? (
              <span
                key={key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: (STATUS_COLORS[key] || "#9ca3af") + "33",
                  color: STATUS_COLORS[key] || "#9ca3af",
                  border: `1px solid ${STATUS_COLORS[key] || "#9ca3af"}55`,
                }}
              >
                {key === "DRIVING"
                  ? "Drive"
                  : key === "ON_DUTY_NOT_DRIVING"
                  ? "On-Duty"
                  : key === "SLEEPER_BERTH"
                  ? "Sleeper"
                  : "Off"}
                : {val.toFixed(1)}h
              </span>
            ) : null
          )}
          <button
            onClick={handleDownload}
            style={{
              padding: "4px 12px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ⬇ PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ overflowX: "auto" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}

export default function ELDLogSheet({ dailyLogs, input }) {
  const [activeDay, setActiveDay] = useState(null); // null = show all

  const logsToShow = activeDay !== null ? [dailyLogs[activeDay]] : dailyLogs;
  const indexOffset = activeDay !== null ? activeDay : 0;

  return (
    <div>
      {/* Day selector */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "var(--shadow)",
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Show:
        </span>
        <button
          onClick={() => setActiveDay(null)}
          style={{
            padding: "5px 12px",
            borderRadius: 20,
            border: "1.5px solid " + (activeDay === null ? "#2563eb" : "#d1d5db"),
            background: activeDay === null ? "#eff6ff" : "white",
            color: activeDay === null ? "#2563eb" : "#374151",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          All Days
        </button>
        {dailyLogs.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1.5px solid " + (activeDay === i ? "#2563eb" : "#d1d5db"),
              background: activeDay === i ? "#eff6ff" : "white",
              color: activeDay === i ? "#2563eb" : "#374151",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Day {i + 1}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          boxShadow: "var(--shadow)",
        }}
      >
        {Object.entries(STATUS_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div
              style={{
                width: 24,
                height: 4,
                background: color,
                borderRadius: 2,
              }}
            />
            <span style={{ color: "#374151" }}>
              {key === "OFF_DUTY"
                ? "Off Duty"
                : key === "SLEEPER_BERTH"
                ? "Sleeper Berth"
                : key === "DRIVING"
                ? "Driving"
                : "On Duty (Not Driving)"}
            </span>
          </div>
        ))}
      </div>

      {logsToShow.map((log, i) => (
        <LogCanvas
          key={activeDay !== null ? activeDay : i}
          dayLog={log}
          input={input}
          dayIndex={activeDay !== null ? activeDay : i}
          totalDays={dailyLogs.length}
        />
      ))}
    </div>
  );
}
