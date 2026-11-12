import { useEffect, useState } from "react";
import {
  alignmentNotes,
  criticalityLabel,
  exposureLabel,
  formatDate,
  kindLabel,
  lifecycle,
  linksOf,
  relationLabel,
  showsUtilization,
  zoneLabel,
} from "../model";
import { useLedger } from "../store";
import type { Disposition } from "../types";
import { Meter, Pill, postureWord } from "../ui";

export function Drawer({
  assetId,
  onClose,
  openAsset,
}: {
  assetId: string;
  onClose: () => void;
  openAsset: (id: string) => void;
}) {
  const ledger = useLedger();
  const asset = ledger.assets.find((item) => item.id === assetId);
  const [purpose, setPurpose] = useState(asset?.purpose ?? "");
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setPurpose(asset?.purpose ?? "");
    setNotes(asset?.notes ?? "");
    setConfirmRemove(false);
  }, [asset?.id, asset?.purpose, asset?.notes]);

  const life = asset ? lifecycle(asset, ledger.people) : "unowned";
  const links = asset ? linksOf(asset.id, ledger.edges) : { inbound: [], outbound: [] };
  const relatedFindings = asset
    ? ledger.findings.filter((finding) => finding.assetIds.includes(asset.id))
    : [];

  return (
    <aside className="dossier" aria-labelledby="dossier-title">
      {!asset ? (
        <div className="dossier-body">
          <h2 id="dossier-title">Missing record</h2>
          <p>This asset is not in the ledger.</p>
          <button type="button" className="btn" data-close onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="dossier-head">
            <div>
              <p className="kicker">
                {zoneLabel[asset.zone]} · {kindLabel[asset.kind]}
                {asset.recorded ? " · Recorded here" : ""}
              </p>
              <h2 id="dossier-title">{asset.name}</h2>
              {asset.handle ? <p className="handle">{asset.handle}</p> : null}
              {asset.address ? <p className="handle">{asset.address}</p> : null}
              <div className="chips">
                <Pill tone={life}>{postureWord(life)}</Pill>
                <Pill tone="neutral">{asset.disposition === "retire" ? "Retire" : "Keep"}</Pill>
                {asset.exposure !== "none" ? <Pill tone="neutral">{exposureLabel[asset.exposure]}</Pill> : null}
              </div>
            </div>
            <button type="button" className="btn" data-close onClick={onClose}>
              Close
            </button>
          </div>
          <div className="dossier-body">
            <ul className="notes">
              {alignmentNotes(asset, ledger.people).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <dl className="facts">
              <div>
                <dt>Team</dt>
                <dd>{asset.team}</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{asset.environment}</dd>
              </div>
              <div>
                <dt>Criticality</dt>
                <dd>{criticalityLabel[asset.criticality]}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{asset.location}</dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>{formatDate(asset.lastSeen)}</dd>
              </div>
              {asset.os ? (
                <div>
                  <dt>System</dt>
                  <dd>{asset.os}</dd>
                </div>
              ) : null}
              {asset.certExpires ? (
                <div>
                  <dt>Certificate</dt>
                  <dd>Expires {formatDate(asset.certExpires)}</dd>
                </div>
              ) : null}
              {typeof asset.agent === "boolean" ? (
                <div>
                  <dt>Agent</dt>
                  <dd>{asset.agent ? "Checking in" : "Not checking in"}</dd>
                </div>
              ) : null}
            </dl>
            {showsUtilization(asset.kind) ? (
              <p className="util-line">
                <Meter value={asset.utilization} />
                <span>{asset.utilization}% of intended capacity</span>
              </p>
            ) : null}
            <h3>Intent</h3>
            <label>
              Owner
              <select
                value={asset.ownerId ?? ""}
                onChange={(event) => ledger.patchAsset(asset.id, { ownerId: event.target.value || null })}
              >
                <option value="">Unassigned</option>
                {ledger.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.active ? "" : " (closed)"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Purpose
              <input
                value={purpose}
                maxLength={240}
                onChange={(event) => setPurpose(event.target.value)}
                onBlur={() => {
                  const next = purpose.trim();
                  if (next && next !== asset.purpose) ledger.patchAsset(asset.id, { purpose: next });
                  else setPurpose(asset.purpose);
                }}
              />
            </label>
            <p>
              <span className="label">Observed</span> {asset.observedUse}
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(asset.useMismatch)}
                onChange={(event) => ledger.patchAsset(asset.id, { useMismatch: event.target.checked })}
              />
              Observed use does not match the purpose
            </label>
            <label>
              Disposition
              <select
                value={asset.disposition}
                onChange={(event) =>
                  ledger.patchAsset(asset.id, { disposition: event.target.value as Disposition })
                }
              >
                <option value="keep">Keep</option>
                <option value="retire">Retire</option>
              </select>
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => {
                  if ((asset.notes ?? "") !== notes) ledger.patchAsset(asset.id, { notes });
                }}
              />
            </label>
            <h3>Connections</h3>
            {links.inbound.length === 0 && links.outbound.length === 0 ? (
              <p className="muted">No recorded link.</p>
            ) : (
              <ul className="plain">
                {links.inbound.map((edge) => {
                  const other = ledger.assets.find((item) => item.id === edge.from);
                  return (
                    <li key={edge.id}>
                      <button type="button" className="name-btn" onClick={() => openAsset(edge.from)}>
                        {other?.name ?? edge.from}
                      </button>{" "}
                      {relationLabel[edge.relation]} {asset.name}
                    </li>
                  );
                })}
                {links.outbound.map((edge) => {
                  const other = ledger.assets.find((item) => item.id === edge.to);
                  return (
                    <li key={edge.id}>
                      {asset.name} {relationLabel[edge.relation]}{" "}
                      <button type="button" className="name-btn" onClick={() => openAsset(edge.to)}>
                        {other?.name ?? edge.to}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3>Findings</h3>
            {relatedFindings.length === 0 ? (
              <p className="muted">No finding names this asset.</p>
            ) : (
              relatedFindings.map((finding) => (
                <article key={finding.id} className="finding compact">
                  <div className="finding-top">
                    <Pill tone={finding.severity}>{finding.severity}</Pill>
                    <strong>{finding.title}</strong>
                  </div>
                  <p>{finding.detail}</p>
                  <div className="row-actions">
                    {finding.state === "open" ? (
                      <>
                        <button type="button" className="btn" onClick={() => ledger.setFinding(finding.id, "acknowledged")}>
                          Acknowledge
                        </button>
                        <button type="button" className="btn" onClick={() => ledger.setFinding(finding.id, "exception")}>
                          Exception
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="muted">{finding.state}</span>
                        <button type="button" className="btn" onClick={() => ledger.setFinding(finding.id, "open")}>
                          Reopen
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
            {asset.recorded ? (
              <div className="remove-block">
                {confirmRemove ? (
                  <>
                    <p>Remove this recorded asset from the browser ledger?</p>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          ledger.removeAsset(asset.id);
                          onClose();
                        }}
                      >
                        Remove
                      </button>
                      <button type="button" className="btn" onClick={() => setConfirmRemove(false)}>
                        Keep
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn" onClick={() => setConfirmRemove(true)}>
                    Remove recorded asset
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
