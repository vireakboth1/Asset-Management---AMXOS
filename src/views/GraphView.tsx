import { useMemo, useState } from "react";
import {
  byLedgerOrder,
  contractEdges,
  kindLabel,
  ZONE_ORDER,
  zoneLabel,
  type VisEdge,
} from "../model";
import { useLedger } from "../store";
import type { Asset, Kind } from "../types";
import { PageHead } from "../ui";

const HIDDEN: Kind[] = ["address", "certificate", "workstation"];

const LANES: string[][] = [
  ["dom-track", "edge-waf", "srv-track-1", "db-customer"],
  ["ip-track", "srv-track-2"],
  ["cert-track"],
  ["dom-vpn", "edge-vpn", "srv-idp"],
  ["ip-vpn", "srv-dc"],
  ["cert-vpn", "saas-payroll"],
  ["dom-edi", "srv-edi", "db-fin"],
  ["ip-edi", "srv-fin"],
  ["cert-edi"],
  ["edge-yard", "srv-tms", "wkst-owen"],
  ["dom-files", "srv-stage", "obj-files"],
  ["ip-files"],
  ["cert-files"],
  ["saas-careers", "wkst-guest"],
  ["wkst-mira", "srv-print"],
  ["wkst-lena"],
];
const COL_W = 208;
const NODE_H = 54;
const GAP_X = 56;
const GAP_Y = 10;
const PAD_X = 18;
const PAD_TOP = 36;

export function GraphView({
  openAsset,
  selectedId,
}: {
  openAsset: (id: string) => void;
  selectedId?: string;
}) {
  const { assets, edges } = useLedger();
  const [full, setFull] = useState(false);
  const visible = useMemo(() => {
    const list = full ? assets : assets.filter((asset) => !HIDDEN.includes(asset.kind));
    return byLedgerOrder(list, assets);
  }, [assets, full]);
  const visibleIds = useMemo(() => new Set(visible.map((asset) => asset.id)), [visible]);
  const visEdges = useMemo(() => contractEdges(edges, visibleIds), [edges, visibleIds]);
  const lanes = useMemo(() => laneMap(visible, edges), [visible, edges]);
  const columns = ZONE_ORDER.map((zone) =>
    visible
      .filter((asset) => asset.zone === zone)
      .sort((a, b) => (lanes.get(a.id) ?? 0) - (lanes.get(b.id) ?? 0)),
  );
  const rowCount = Math.max(1, ...lanes.values(), 0) + 1;
  const width = PAD_X * 2 + ZONE_ORDER.length * COL_W + (ZONE_ORDER.length - 1) * GAP_X;
  const height = PAD_TOP + rowCount * (NODE_H + GAP_Y) + 8;
  const position = new Map<string, { x: number; y: number }>();
  for (const asset of visible) {
    position.set(asset.id, {
      x: PAD_X + ZONE_ORDER.indexOf(asset.zone) * (COL_W + GAP_X),
      y: PAD_TOP + (lanes.get(asset.id) ?? 0) * (NODE_H + GAP_Y),
    });
  }

  const neighbor = new Set<string>();
  if (selectedId) {
    neighbor.add(selectedId);
    for (const edge of visEdges) {
      if (edge.from === selectedId || edge.to === selectedId) {
        neighbor.add(edge.from);
        neighbor.add(edge.to);
      }
    }
  }

  return (
    <div>
      <PageHead
        kicker="Relationships"
        title="Graph"
        lede="External names on the left, the records they can reach on the right. Addresses and endpoints stay tucked away until you ask for the full ledger."
        actions={
          <button type="button" className="chip" aria-pressed={full} onClick={() => setFull((value) => !value)}>
            {full ? "Showing the full ledger" : "Show addresses and endpoints"}
          </button>
        }
      />
      <div className="graph-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Asset graph by zone">
          {ZONE_ORDER.map((zone, index) => (
            <text key={zone} className="zone-label" x={PAD_X + index * (COL_W + GAP_X)} y={20}>
              {zoneLabel[zone]} · {columns[index].length}
            </text>
          ))}
          {visEdges.map((edge) => {
            const related = Boolean(selectedId) && (edge.from === selectedId || edge.to === selectedId);
            return (
              <GraphEdge
                key={`${edge.from}-${edge.to}`}
                edge={edge}
                position={position}
                hot={related}
                dim={Boolean(selectedId) && !related}
              />
            );
          })}
          {visible.map((asset) => {
            const point = position.get(asset.id);
            if (!point) return null;
            const dim = Boolean(selectedId) && !neighbor.has(asset.id);
            return (
              <foreignObject key={asset.id} x={point.x} y={point.y} width={COL_W} height={NODE_H}>
                <button
                  type="button"
                  className={`gnode ${asset.zone}${selectedId === asset.id ? " hot" : ""}${dim ? " dim" : ""}`}
                  aria-pressed={selectedId === asset.id}
                  onClick={() => openAsset(asset.id)}
                >
                  <b>{asset.name}</b>
                  <small>{subtitle(asset)}</small>
                </button>
              </foreignObject>
            );
          })}
        </svg>
      </div>
      <p className="trace">{traceSentence(selectedId, assets, visEdges)}</p>
    </div>
  );
}

function GraphEdge({
  edge,
  position,
  hot,
  dim,
}: {
  edge: VisEdge;
  position: Map<string, { x: number; y: number }>;
  hot: boolean;
  dim: boolean;
}) {
  const from = position.get(edge.from);
  const to = position.get(edge.to);
  if (!from || !to) return null;
  const same = from.x === to.x;
  const x1 = from.x + COL_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = same ? to.x + COL_W : to.x;
  const y2 = to.y + NODE_H / 2;
  const path = same
    ? `M ${x1} ${y1} C ${x1 + 34} ${y1}, ${x1 + 34} ${y2}, ${x2} ${y2}`
    : curve(x1, y1, x2, y2);
  return <path d={path} className={`edge${hot ? " hot" : ""}${dim ? " dim" : ""}`} />;
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const dir = x2 >= x1 ? 1 : -1;
  const dx = Math.max(28, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + dx * dir} ${y1}, ${x2 - dx * dir} ${y2}, ${x2} ${y2}`;
}

function laneMap(visible: Asset[], edges: { from: string; to: string }[]): Map<string, number> {
  const assigned = new Map<string, number>();
  const occupied = new Set<string>();
  const byId = new Map(visible.map((asset) => [asset.id, asset]));
  LANES.forEach((ids, lane) => {
    for (const id of ids) {
      const asset = byId.get(id);
      if (!asset) continue;
      const key = `${lane}:${asset.zone}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      assigned.set(id, lane);
    }
  });
  let next = LANES.length;
  for (const asset of visible) {
    if (assigned.has(asset.id)) continue;
    const target = edges.find((edge) => edge.from === asset.id && assigned.has(edge.to));
    const targetLane = target ? assigned.get(target.to) : undefined;
    const key = targetLane === undefined ? "" : `${targetLane}:${asset.zone}`;
    if (targetLane !== undefined && !occupied.has(key)) {
      occupied.add(key);
      assigned.set(asset.id, targetLane);
      continue;
    }
    occupied.add(`${next}:${asset.zone}`);
    assigned.set(asset.id, next);
    next += 1;
  }
  const used = [...new Set(assigned.values())].sort((a, b) => a - b);
  const compact = new Map(used.map((lane, index) => [lane, index]));
  for (const [id, lane] of assigned) assigned.set(id, compact.get(lane) ?? lane);
  return assigned;
}

function subtitle(asset: Asset): string {
  const retire = asset.disposition === "retire" ? "Retire · " : "";
  return `${retire}${asset.handle || asset.address || kindLabel[asset.kind]}`;
}

function traceSentence(selectedId: string | undefined, assets: Asset[], visEdges: VisEdge[]): string {
  if (!selectedId) return "Select an asset to see what it reaches, and what reaches it.";
  const asset = assets.find((item) => item.id === selectedId);
  if (!asset) return "This record is not in the ledger.";
  const name = (id: string) => assets.find((item) => item.id === id)?.name ?? id;
  const outgoing = visEdges.filter((edge) => edge.from === selectedId);
  const incoming = visEdges.filter((edge) => edge.to === selectedId);
  if (outgoing.length === 0 && incoming.length === 0) {
    return `${asset.name} has no recorded path in this view.`;
  }
  const hop = (edge: VisEdge, target: string) => {
    const via = edge.via.map(name);
    return via.length > 0 ? `${name(target)} via ${via.join(", ")}` : name(target);
  };
  const parts: string[] = [];
  if (outgoing.length > 0) parts.push(`reaches ${outgoing.map((edge) => hop(edge, edge.to)).join("; ")}`);
  if (incoming.length > 0) parts.push(`is reached from ${incoming.map((edge) => hop(edge, edge.from)).join("; ")}`);
  return `${asset.name} ${parts.join(", and ")}.`;
}
