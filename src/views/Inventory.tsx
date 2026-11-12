import { useState, type FormEvent } from "react";
import { AS_OF, exposureLabel, formatDate, isStale, kindLabel, lifecycle, personName, zoneLabel } from "../model";
import { useLedger, type NewAssetInput } from "../store";
import type { Environment, Exposure, Kind, Zone } from "../types";
import { PageHead, Pill, postureWord } from "../ui";

const zones: Array<Zone | "all"> = ["all", "external", "edge", "internal", "data"];
const lives = ["all", "aligned", "drifting", "unowned"] as const;

const kinds: Kind[] = [
  "domain",
  "address",
  "certificate",
  "gateway",
  "server",
  "workstation",
  "identity",
  "database",
  "storage",
  "saas",
];

export function Inventory({
  openAsset,
  selectedId,
}: {
  openAsset: (id: string) => void;
  selectedId?: string;
}) {
  const ledger = useLedger();
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<(typeof zones)[number]>("all");
  const [life, setLife] = useState<(typeof lives)[number]>("all");
  const [recording, setRecording] = useState(false);

  const filtered = ledger.assets.filter((asset) => {
    if (zone !== "all" && asset.zone !== zone) return false;
    if (life !== "all" && lifecycle(asset, ledger.people) !== life) return false;
    const haystack = [
      asset.name,
      asset.handle,
      asset.address,
      asset.team,
      asset.purpose,
      asset.os,
      asset.id,
      personName(ledger.people, asset.ownerId),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <PageHead
        kicker="Ledger"
        title="Inventory"
        lede="Every asset in the Northline sample, plus records you add in this browser."
        actions={
          <button type="button" className="btn primary" onClick={() => setRecording((open) => !open)}>
            {recording ? "Close form" : "Record an asset"}
          </button>
        }
      />
      {recording ? (
        <RecordForm
          onClose={() => setRecording(false)}
          onCreated={(id) => {
            setQuery("");
            setZone("all");
            setLife("all");
            setRecording(false);
            openAsset(id);
          }}
        />
      ) : null}
      <div className="filters">
        <label className="grow">
          <span className="sr">Filter the inventory</span>
          <input
            type="search"
            value={query}
            placeholder="Filter by name, address, team, or owner"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {zones.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={zone === item} onClick={() => setZone(item)}>
            {item === "all" ? "All zones" : zoneLabel[item]}
          </button>
        ))}
        {lives.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={life === item} onClick={() => setLife(item)}>
            {item === "all" ? "Any alignment" : postureWord(item)}
          </button>
        ))}
      </div>
      <p className="count">
        {filtered.length} of {ledger.assets.length} records
      </p>
      {filtered.length === 0 ? (
        <p className="empty">Nothing in the ledger matches this filter.</p>
      ) : (
        <div className="table-wrap">
          <table className="sheet">
            <caption className="sr">Assets in the ledger</caption>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Zone</th>
                <th>Kind</th>
                <th>Owner</th>
                <th>Alignment</th>
                <th>Facing</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => {
                const lifeState = lifecycle(asset, ledger.people);
                return (
                  <tr
                    key={asset.id}
                    tabIndex={0}
                    aria-selected={selectedId === asset.id}
                    onClick={() => openAsset(asset.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openAsset(asset.id);
                      }
                    }}
                  >
                    <td>
                      <strong>{asset.name}</strong>
                      <span className="handle block">{asset.handle || asset.address || asset.team}</span>
                    </td>
                    <td>{zoneLabel[asset.zone]}</td>
                    <td>{kindLabel[asset.kind]}</td>
                    <td>{personName(ledger.people, asset.ownerId)}</td>
                    <td>
                      <Pill tone={lifeState}>{postureWord(lifeState)}</Pill>
                    </td>
                    <td>{asset.exposure === "none" ? "Internal" : exposureLabel[asset.exposure]}</td>
                    <td>
                      {formatDate(asset.lastSeen)}
                      {isStale(asset) ? <span className="stale"> Stale</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecordForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { addAsset, assets, people } = useLedger();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<Kind>("server");
  const [zone, setZone] = useState<Zone>("internal");
  const endpoint = kind === "server" || kind === "workstation";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: NewAssetInput = {
      name: String(form.get("name") ?? ""),
      kind,
      zone,
      team: String(form.get("team") ?? ""),
      location: String(form.get("location") ?? ""),
      purpose: String(form.get("purpose") ?? ""),
      observedUse: String(form.get("observedUse") ?? ""),
      exposure: String(form.get("exposure") ?? "none") as Exposure,
      environment: String(form.get("environment") ?? "production") as Environment,
      ownerId: String(form.get("ownerId") ?? "") || undefined,
      facesId: String(form.get("facesId") ?? "") || undefined,
      agent: endpoint ? form.get("agent") === "on" : undefined,
      useMismatch: form.get("useMismatch") === "on",
      disposition: form.get("disposition") === "retire" ? "retire" : "keep",
    };
    if ([input.name, input.team, input.location, input.purpose, input.observedUse].some((value) => !value.trim())) {
      setError("Name, team, location, purpose, and observed use all need a value.");
      return;
    }
    if (assets.filter((asset) => asset.recorded).length >= 40) {
      setError("This browser ledger is full at 40 recorded assets.");
      return;
    }
    const id = addAsset(input);
    if (!id) {
      setError("The record could not be added.");
      return;
    }
    onCreated(id);
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <div className="section-head">
        <h2>Record an asset</h2>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
      <p className="muted">
        This writes to the ledger in this browser. It does not scan a network. Last seen is set to {formatDate(AS_OF)}.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-grid">
        <label>
          Name
          <input name="name" maxLength={80} required placeholder="SRV-APP-04" />
        </label>
        <label>
          Team
          <input name="team" maxLength={80} required placeholder="Customer Platform" />
        </label>
        <label>
          Location
          <input name="location" maxLength={80} required placeholder="Ashland DC" />
        </label>
        <label>
          Kind
          <select value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
            {kinds.map((item) => (
              <option key={item} value={item}>
                {kindLabel[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zone
          <select value={zone} onChange={(event) => setZone(event.target.value as Zone)}>
            {(Object.keys(zoneLabel) as Zone[]).map((item) => (
              <option key={item} value={item}>
                {zoneLabel[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Exposure
          <select name="exposure" defaultValue="none">
            <option value="none">Internal only</option>
            <option value="internet">Internet</option>
            <option value="partner">Partners</option>
            <option value="site">Site edge</option>
          </select>
        </label>
        <label>
          Environment
          <select name="environment" defaultValue="production">
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="corporate">Corporate</option>
            <option value="vendor">Vendor</option>
          </select>
        </label>
        <label>
          Owner
          <select name="ownerId" defaultValue="">
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.active ? "" : " (closed)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Faces
          <select name="facesId" defaultValue="">
            <option value="">No recorded link</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Disposition
          <select name="disposition" defaultValue="keep">
            <option value="keep">Keep</option>
            <option value="retire">Retire</option>
          </select>
        </label>
        <label className="span-2">
          Purpose
          <input name="purpose" maxLength={240} required placeholder="What this asset is for" />
        </label>
        <label className="span-2">
          Observed use
          <input name="observedUse" maxLength={240} required placeholder="What it is actually doing" />
        </label>
        {endpoint ? (
          <label className="check">
            <input type="checkbox" name="agent" defaultChecked />
            Agent is checking in
          </label>
        ) : null}
        <label className="check">
          <input type="checkbox" name="useMismatch" />
          Observed use does not match the purpose
        </label>
      </div>
      <button type="submit" className="btn primary">
        Add to the ledger
      </button>
    </form>
  );
}
