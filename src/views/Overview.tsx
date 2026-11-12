import { hrefFor } from "../router";
import { useLedger } from "../store";
import { doorPosture, formatDate, formatWhen, lifecycle, personName } from "../model";
import type { Finding, Posture } from "../types";
import { PageHead, Pill, postureWord } from "../ui";

const postureRank: Record<Posture, number> = { withdraw: 0, repair: 1, watch: 2, held: 3 };
const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };

export function Overview({ openAsset }: { openAsset: (id: string) => void }) {
  const { assets, people, edges, findings, observations, setFinding } = useLedger();
  const endpoints = assets.filter((asset) => asset.kind === "server" || asset.kind === "workstation");
  const checkingIn = endpoints.filter((asset) => asset.agent).length;
  const doors = assets.filter((asset) => asset.kind === "domain" || asset.kind === "saas");
  const rankedDoors = doors
    .map((door) => ({ door, posture: doorPosture(door, assets, people, edges, findings) }))
    .sort((a, b) => postureRank[a.posture] - postureRank[b.posture] || a.door.name.localeCompare(b.door.name));
  const aligned = assets.filter((asset) => lifecycle(asset, people) === "aligned").length;
  const attention = assets
    .filter((asset) => lifecycle(asset, people) !== "aligned")
    .sort((a, b) => {
      const left = lifecycle(a, people) === "unowned" ? 0 : 1;
      const right = lifecycle(b, people) === "unowned" ? 0 : 1;
      return left - right || a.name.localeCompare(b.name);
    });
  const open = [...findings.filter((finding) => finding.state === "open")].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
  const resting = findings.filter((finding) => finding.state !== "open").length;

  return (
    <div>
      <PageHead
        kicker="Monitoring"
        title="Overview"
        lede="Internal endpoints and the names that face them, with ownership and observed use on the same record."
      />
      <section className="stats" aria-label="Estate figures">
        <div className="stat">
          <b>{endpoints.length}</b>
          <span>Servers and workstations</span>
        </div>
        <div className="stat">
          <b>{doors.length}</b>
          <span>Names facing the estate</span>
        </div>
        <div className="stat">
          <b>{aligned}</b>
          <span>Aligned, of {assets.length} records</span>
        </div>
        <div className="stat">
          <b>{open.length}</b>
          <span>Open findings{resting > 0 ? `, ${resting} resting` : ""}</span>
        </div>
      </section>
      <p className="coverage">
        {checkingIn} of {endpoints.length} endpoints are checking in with an agent.{" "}
        {rankedDoors.filter((item) => item.posture === "held").length} of {doors.length} facing names are held.
      </p>

      <section className="block">
        <div className="section-head">
          <h2>Boundary</h2>
          <a href={hrefFor("surface")}>Open the surface</a>
        </div>
        <div className="doors">
          {rankedDoors.map(({ door, posture }) => (
            <article key={door.id} className="door">
              <div className="door-top">
                <button type="button" className="name-btn" onClick={() => openAsset(door.id)}>
                  {door.name}
                </button>
                {door.handle ? <span className="handle">{door.handle}</span> : null}
                <Pill tone={posture}>{postureWord(posture)}</Pill>
              </div>
              <p className="muted">
                {personName(people, door.ownerId)} · {door.team}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="split">
        <section>
          <div className="section-head">
            <h2>Out of alignment</h2>
            <a href={hrefFor("usage")}>Usage</a>
          </div>
          <ul className="plain">
            {attention.slice(0, 6).map((asset) => {
              const life = lifecycle(asset, people);
              return (
                <li key={asset.id}>
                  <button type="button" className="name-btn" onClick={() => openAsset(asset.id)}>
                    {asset.name}
                  </button>
                  <Pill tone={life}>{postureWord(life)}</Pill>
                  <span className="muted">{asset.purpose}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <div className="section-head">
            <h2>Open findings</h2>
            <span className="muted">{open.length} open</span>
          </div>
          <div className="queue">
            {open.map((finding) => (
              <FindingRow key={finding.id} finding={finding} onAsset={openAsset} onState={setFinding} />
            ))}
          </div>
        </section>
      </div>

      <section className="block">
        <h2>Recent observations</h2>
        <ol className="obs">
          {observations.map((item) => {
            const asset = assets.find((candidate) => candidate.id === item.assetId);
            return (
              <li key={item.id}>
                <time dateTime={item.at}>{formatWhen(item.at)}</time>
                <button type="button" className="name-btn" onClick={() => openAsset(item.assetId)}>
                  {asset?.name ?? item.assetId}
                </button>
                <p>{item.text}</p>
              </li>
            );
          })}
        </ol>
        <p className="fine">Observations are part of the Northline sample, current through {formatDate("2026-11-12")}.</p>
      </section>
    </div>
  );
}

function FindingRow({
  finding,
  onAsset,
  onState,
}: {
  finding: Finding;
  onAsset: (id: string) => void;
  onState: (id: string, state: Finding["state"]) => void;
}) {
  const { assets } = useLedger();
  return (
    <article className="finding">
      <div className="finding-top">
        <Pill tone={finding.severity}>{finding.severity}</Pill>
        <h3>{finding.title}</h3>
      </div>
      <p>{finding.detail}</p>
      <div className="chips">
        {finding.assetIds.map((id) => {
          const asset = assets.find((candidate) => candidate.id === id);
          return (
            <button key={id} type="button" className="chip" onClick={() => onAsset(id)}>
              {asset?.name ?? id}
            </button>
          );
        })}
      </div>
      <div className="row-actions">
        {finding.state === "open" ? (
          <>
            <button type="button" className="btn" onClick={() => onState(finding.id, "acknowledged")}>
              Acknowledge
            </button>
            <button type="button" className="btn" onClick={() => onState(finding.id, "exception")}>
              Exception
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => onState(finding.id, "open")}>
            Reopen
          </button>
        )}
      </div>
    </article>
  );
}
