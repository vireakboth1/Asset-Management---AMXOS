import { useState } from "react";
import {
  alignmentNotes,
  formatDate,
  lifecycle,
  personName,
  showsUtilization,
} from "../model";
import { useLedger } from "../store";
import type { Lifecycle } from "../types";
import { Meter, PageHead, Pill, postureWord } from "../ui";

const filters = ["attention", "drifting", "unowned", "aligned", "all"] as const;
type UsageFilter = (typeof filters)[number];

export function Usage({ openAsset }: { openAsset: (id: string) => void }) {
  const { assets, people } = useLedger();
  const [filter, setFilter] = useState<UsageFilter>("attention");
  const teams = [...new Set(assets.map((asset) => asset.team))].sort((a, b) => a.localeCompare(b));
  const rows = assets
    .filter((asset) => {
      const life = lifecycle(asset, people);
      if (filter === "all") return true;
      if (filter === "attention") return life !== "aligned";
      return life === filter;
    })
    .sort((a, b) => rank(lifecycle(a, people)) - rank(lifecycle(b, people)) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHead
        kicker="Alignment"
        title="Usage"
        lede="Where the stated purpose, the owner, and the observed use disagree."
      />
      <div className="table-wrap">
        <table className="sheet">
          <caption className="sr">Alignment by team</caption>
          <thead>
            <tr>
              <th>Team</th>
              <th>Records</th>
              <th>Aligned</th>
              <th>Drifting</th>
              <th>Unowned</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const group = assets.filter((asset) => asset.team === team);
              const count = (life: Lifecycle) => group.filter((asset) => lifecycle(asset, people) === life).length;
              return (
                <tr key={team}>
                  <td>{team}</td>
                  <td>{group.length}</td>
                  <td>{count("aligned")}</td>
                  <td>{count("drifting")}</td>
                  <td>{count("unowned")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="filters">
        {filters.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {item === "attention" ? "Needs alignment" : item === "all" ? "Entire estate" : postureWord(item)}
          </button>
        ))}
      </div>
      <p className="count">{rows.length} records</p>
      <div className="use-list">
        {rows.map((asset) => {
          const life = lifecycle(asset, people);
          return (
            <article key={asset.id} className="use-row">
              <header>
                <button type="button" className="name-btn" onClick={() => openAsset(asset.id)}>
                  {asset.name}
                </button>
                <span className="handle">{asset.team}</span>
                <Pill tone={life}>{postureWord(life)}</Pill>
              </header>
              <p>
                <span className="label">Purpose</span> {asset.purpose}
              </p>
              <p>
                <span className="label">Observed</span> {asset.observedUse}
              </p>
              <p className="muted">
                {personName(people, asset.ownerId)} · last seen {formatDate(asset.lastSeen)}
                {asset.certExpires ? ` · certificate ${formatDate(asset.certExpires)}` : ""}
              </p>
              {showsUtilization(asset.kind) ? (
                <p className="util-line">
                  <Meter value={asset.utilization} />
                  <span>
                    {asset.utilization}% of intended capacity
                  </span>
                </p>
              ) : null}
              <ul className="notes">
                {alignmentNotes(asset, people).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function rank(life: Lifecycle): number {
  if (life === "unowned") return 0;
  if (life === "drifting") return 1;
  return 2;
}
