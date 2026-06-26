import { useState } from "react";
import Health from "../Health";
import HealthStub from "./HealthStub";
import HubCard from "../kit/HubCard";
import { dateLine } from "./healthFormat";
import "../kit/healthHub.css";

// HealthHub — the Health section's landing screen ("section front"). A calm row of
// three cards (Sleep · Body · Gym) over a quiet dateline, each the whole-card tap
// target into its face. It WRAPS the existing Gym front page (Health.jsx) unchanged
// — the Gym card opens it behind a thin "← Health" back link; Sleep/Body open
// "coming soon" stubs (S6/S7 replace those). Screens are self-managed local state,
// the same pattern Health.jsx uses for its own front/archive/records subviews.
//
// PIECE 1 (scaffold + routing): the three cards are placeholders; piece 2 wires
// them to the S5 calc layer + gym data with the empty/sparse/trend rules.
export default function HealthHub() {
  const [sub, setSub] = useState("hub"); // 'hub' | 'gym' | 'sleep' | 'body'

  if (sub === "gym") {
    return (
      <div className="hub-wrap">
        <button type="button" className="hub-back" onClick={() => setSub("hub")}>
          ← Health
        </button>
        <Health />
      </div>
    );
  }
  if (sub === "sleep") return <HealthStub title="Sleep" onBack={() => setSub("hub")} />;
  if (sub === "body") return <HealthStub title="Body" onBack={() => setSub("hub")} />;

  return (
    <div className="hub">
      <div className="hub-dateline">{dateLine()}</div>

      <div className="hub-cards">
        <HubCard label="last night" headline="—" onClick={() => setSub("sleep")} />
        <HubCard label="—" headline="—" onClick={() => setSub("body")} />
        <HubCard label="—" headline="—" onClick={() => setSub("gym")} />
      </div>
    </div>
  );
}
