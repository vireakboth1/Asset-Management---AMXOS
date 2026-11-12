import type {
  Asset,
  Criticality,
  Edge,
  Exposure,
  Finding,
  Kind,
  Lifecycle,
  Person,
  Posture,
  Relation,
  Zone,
} from "./types";

export const AS_OF = "2026-11-12";
export const RENEW_BY = "2026-12-12";
export const STALE_BEFORE = "2026-11-05";

export const ZONE_ORDER: Zone[] = ["external", "edge", "internal", "data"];

const UTIL_KINDS = new Set<Kind>([
  "gateway",
  "server",
  "workstation",
  "identity",
  "database",
  "storage",
]);

export const kindLabel: Record<Kind, string> = {
  domain: "Domain",
  address: "Address",
  certificate: "Certificate",
  gateway: "Gateway",
  server: "Server",
  workstation: "Workstation",
  identity: "Identity",
  database: "Database",
  storage: "Storage",
  saas: "SaaS",
};

export const zoneLabel: Record<Zone, string> = {
  external: "External",
  edge: "Edge",
  internal: "Internal",
  data: "Data",
};

export const exposureLabel: Record<Exposure, string> = {
  internet: "Internet",
  partner: "Partners",
  site: "Site edge",
  none: "Internal only",
};

export const criticalityLabel: Record<Criticality, string> = {
  crown: "Crown",
  high: "High",
  standard: "Standard",
  low: "Low",
};

export const relationLabel: Record<Relation, string> = {
  resolves: "resolves to",
  presents: "presents",
  terminates: "terminates on",
  runs: "passes to",
  reads: "reads",
  authenticates: "authenticates with",
  reaches: "reaches",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatWhen(iso: string): string {
  const [date, time] = iso.split("T");
  if (!time) return formatDate(iso);
  return `${formatDate(date)} · ${time.slice(0, 5)}`;
}

export function showsUtilization(kind: Kind): boolean {
  return UTIL_KINDS.has(kind);
}

export function personById(people: Person[], id?: string): Person | undefined {
  if (!id) return undefined;
  return people.find((person) => person.id === id);
}

export function personName(people: Person[], id?: string): string {
  return personById(people, id)?.name ?? "Unassigned";
}

export function isStale(asset: Asset): boolean {
  return asset.lastSeen < STALE_BEFORE;
}

export function lifecycle(asset: Asset, people: Person[]): Lifecycle {
  const owner = personById(people, asset.ownerId);
  if (!asset.ownerId || !owner) return "unowned";
  if (!owner.active) return "drifting";
  if (asset.certExpires && asset.certExpires <= RENEW_BY) return "drifting";
  if ((asset.kind === "server" || asset.kind === "workstation") && asset.agent === false) return "drifting";
  if (asset.useMismatch) return "drifting";
  if (
    !asset.recorded &&
    showsUtilization(asset.kind) &&
    asset.utilization < 15 &&
    asset.criticality !== "low"
  ) {
    return "drifting";
  }
  if (asset.exposure !== "none" && (asset.zone === "internal" || asset.zone === "data")) return "drifting";
  if (isStale(asset) && (asset.kind === "server" || asset.kind === "workstation" || asset.kind === "gateway")) {
    return "drifting";
  }
  return "aligned";
}

export function alignmentNotes(asset: Asset, people: Person[]): string[] {
  const notes: string[] = [];
  const owner = personById(people, asset.ownerId);
  if (!asset.ownerId || !owner) notes.push("No owner is recorded.");
  else if (!owner.active) notes.push(`${owner.name} is no longer active, and this asset is still assigned to them.`);
  if (asset.certExpires && asset.certExpires < AS_OF) {
    notes.push(`Certificate expired ${formatDate(asset.certExpires)}.`);
  } else if (asset.certExpires && asset.certExpires <= RENEW_BY) {
    notes.push(`Certificate expires ${formatDate(asset.certExpires)}, inside the renewal window.`);
  }
  if ((asset.kind === "server" || asset.kind === "workstation") && asset.agent === false) {
    notes.push("No management agent is checking in.");
  }
  if (asset.useMismatch) notes.push("Observed use does not match the stated purpose.");
  if (
    !asset.recorded &&
    showsUtilization(asset.kind) &&
    asset.utilization < 15 &&
    asset.criticality !== "low"
  ) {
    notes.push(`Utilization is ${asset.utilization}% of intended capacity.`);
  }
  if (asset.exposure !== "none" && asset.zone === "internal") {
    notes.push("This internal asset is still on a public path.");
  }
  if (asset.exposure !== "none" && asset.zone === "data") {
    notes.push("This data store is still on a public path.");
  }
  if (isStale(asset)) notes.push(`Last seen ${formatDate(asset.lastSeen)}, outside the current week.`);
  if (asset.disposition === "retire") notes.push("Marked retire, so it should leave the estate boundary.");
  if (notes.length === 0) notes.push("Owner, purpose, and observed use agree.");
  return notes;
}

export function downstream(id: string, edges: Edge[]): string[] {
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of edges) {
      if (edge.from !== current || seen.has(edge.to) || edge.to === id) continue;
      seen.add(edge.to);
      queue.push(edge.to);
    }
  }
  return [...seen];
}

export function linksOf(id: string, edges: Edge[]) {
  return {
    inbound: edges.filter((edge) => edge.to === id),
    outbound: edges.filter((edge) => edge.from === id),
  };
}

export type VisEdge = { from: string; to: string; via: string[] };

export function contractEdges(edges: Edge[], visible: Set<string>): VisEdge[] {
  const result: VisEdge[] = [];
  const seen = new Set<string>();

  for (const start of visible) {
    const queue: { node: string; via: string[] }[] = [{ node: start, via: [] }];
    const visited = new Set<string>([start]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      for (const edge of edges) {
        if (edge.from !== current.node) continue;
        if (visible.has(edge.to)) {
          if (edge.to === start) continue;
          const key = `${start}\0${edge.to}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ from: start, to: edge.to, via: current.via });
          }
        } else if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({ node: edge.to, via: [...current.via, edge.to] });
        }
      }
    }
  }

  return result;
}

export function doorPosture(
  asset: Asset,
  assets: Asset[],
  people: Person[],
  edges: Edge[],
  findings: Finding[],
): Posture {
  const ids = new Set([asset.id, ...downstream(asset.id, edges)]);
  const group = assets.filter((item) => ids.has(item.id));
  if (group.some((item) => item.disposition === "retire")) return "withdraw";
  const open = findings.filter(
    (finding) => finding.state === "open" && finding.assetIds.some((id) => ids.has(id)),
  );
  const onDoor = open.filter((finding) => finding.assetIds.includes(asset.id));
  if (onDoor.some((finding) => finding.severity === "critical" || finding.severity === "high")) return "repair";
  const drifted = group.some((item) => lifecycle(item, people) !== "aligned");
  if (drifted || open.length > 0) return "watch";
  return "held";
}

export function byLedgerOrder(list: Asset[], all: Asset[]): Asset[] {
  const order = new Map(all.map((asset, index) => [asset.id, index]));
  return [...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}
