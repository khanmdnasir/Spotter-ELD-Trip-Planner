import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STATUS_COLORS = {
  DRIVING: "#2563eb",
  ON_DUTY_NOT_DRIVING: "#d97706",
  OFF_DUTY: "#6b7280",
  SLEEPER_BERTH: "#7c3aed",
};

const STATUS_LABELS = {
  DRIVING: "Driving",
  ON_DUTY_NOT_DRIVING: "On Duty (Not Driving)",
  OFF_DUTY: "Off Duty",
  SLEEPER_BERTH: "Sleeper Berth",
};

export default function RouteMap({ result }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!L || !result) return;

    // Fix leaflet default icon path
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true });
    leafletMap.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    const { coordinates, routes } = result;
    const bounds = [];

    // Draw route: current → pickup
    const route1Coords = routes.current_to_pickup.geometry.map(([lon, lat]) => [lat, lon]);
    if (route1Coords.length > 0) {
      L.polyline(route1Coords, { color: "#2563eb", weight: 4, opacity: 0.8 }).addTo(map);
      bounds.push(...route1Coords);
    }

    // Draw route: pickup → dropoff
    const route2Coords = routes.pickup_to_dropoff.geometry.map(([lon, lat]) => [lat, lon]);
    if (route2Coords.length > 0) {
      L.polyline(route2Coords, { color: "#16a34a", weight: 4, opacity: 0.8 }).addTo(map);
      bounds.push(...route2Coords);
    }

    // Custom icon helper
    function makeIcon(color, label) {
      return L.divIcon({
        className: "",
        html: `<div style="
          background:${color};
          color:white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          width:32px;height:32px;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          border:2px solid white;
          font-size:14px;
        "><span style="transform:rotate(45deg)">${label}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    }

    // Current location marker
    const cur = coordinates.current;
    L.marker([cur.lat, cur.lon], { icon: makeIcon("#374151", "🚛") })
      .addTo(map)
      .bindPopup(
        `<strong>Current Location</strong><br>${result.input.current_location}`
      );
    bounds.push([cur.lat, cur.lon]);

    // Pickup marker
    const pu = coordinates.pickup;
    L.marker([pu.lat, pu.lon], { icon: makeIcon("#16a34a", "📦") })
      .addTo(map)
      .bindPopup(
        `<strong>Pickup</strong><br>${result.input.pickup_location}<br>
        <em>Distance: ${routes.current_to_pickup.distance_miles} mi</em>`
      );
    bounds.push([pu.lat, pu.lon]);

    // Dropoff marker
    const dr = coordinates.dropoff;
    L.marker([dr.lat, dr.lon], { icon: makeIcon("#dc2626", "🏁") })
      .addTo(map)
      .bindPopup(
        `<strong>Dropoff</strong><br>${result.input.dropoff_location}<br>
        <em>Distance: ${routes.pickup_to_dropoff.distance_miles} mi</em>`
      );
    bounds.push([dr.lat, dr.lon]);

    // Rest stop markers
    const events = result.trip.events || [];
    const restEvents = events.filter(
      (e) => e.status === "SLEEPER_BERTH" || e.status === "OFF_DUTY"
    );

    // Mark any stops from the trip
    const stops = result.trip.stops || [];
    stops.forEach((stop) => {
      // We don't have stop coords — just note them
    });

    // Fit map to bounds
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [result]);

  const { routes, trip } = result;
  const totalMiles = Math.round(trip.total_distance_miles);

  return (
    <div>
      {/* Map */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>Route Map</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {totalMiles} mi total •{" "}
            <span style={{ color: "#2563eb" }}>
              ━ to pickup ({routes.current_to_pickup.distance_miles} mi)
            </span>{" "}
            <span style={{ color: "#16a34a" }}>
              ━ to dropoff ({routes.pickup_to_dropoff.distance_miles} mi)
            </span>
          </div>
        </div>
        <div ref={mapRef} style={{ height: 420, width: "100%" }} />
      </div>

      {/* Stop list */}
      <StopList trip={trip} routes={routes} />
    </div>
  );
}

function StopList({ trip, routes }) {
  const events = trip.events || [];

  // Build a readable timeline
  const significantEvents = events.filter((e) =>
    ["ON_DUTY_NOT_DRIVING", "SLEEPER_BERTH"].includes(e.status)
  );

  function fmtHours(h) {
    const days = Math.floor(h / 24);
    const hrs = Math.floor(h % 24);
    const min = Math.round((h % 1) * 60);
    if (days > 0) return `Day ${days + 1}, ${hrs.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
    return `${hrs.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }

  function fmtDuration(h) {
    const hrs = Math.floor(h);
    const min = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${min}min`;
    if (min === 0) return `${hrs}hr`;
    return `${hrs}hr ${min}min`;
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: 15 }}>
        Trip Timeline
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {events.map((evt, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 16px",
              borderBottom: i < events.length - 1 ? "1px solid #f3f4f6" : "none",
              background: i % 2 === 0 ? "white" : "#fafafa",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: STATUS_COLORS[evt.status] || "#9ca3af",
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[evt.status] }}>
                {STATUS_LABELS[evt.status]}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {evt.location} — {fmtDuration(evt.duration)}
              </div>
              {evt.notes && (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{evt.notes}</div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>
              {fmtHours(evt.start_time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
