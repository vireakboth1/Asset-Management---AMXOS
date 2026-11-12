import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { flows, observations, paths, people, seedAssets, seedEdges, seedFindings } from "./data";
import type { Asset, AssetPatch, Disposition, Edge, Finding, FindingState, Kind, Zone } from "./types";

const STORAGE_KEY = "amxos.ledger.v1";

const KINDS = new Set<Kind>([
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
]);

const ZONES = new Set<Zone>(["external", "edge", "internal", "data"]);

type Persisted = {
  version: 1;
  overrides: Record<string, AssetPatch>;
  findingState: Record<string, FindingState>;
  customAssets: Asset[];
  customEdges: Edge[];
};

type State = Persisted;

type Action =
  | { type: "patch"; id: string; patch: AssetPatch }
  | { type: "finding"; id: string; state: FindingState }
  | { type: "add"; asset: Asset; edge?: Edge }
  | { type: "remove"; id: string }
  | { type: "reset" };

const LedgerContext = createContext<Ledger | null>(null);

export type NewAssetInput = {
  name: string;
  kind: Kind;
  zone: Zone;
  team: string;
  location: string;
  purpose: string;
  observedUse: string;
  exposure: Asset["exposure"];
  environment: Asset["environment"];
  ownerId?: string;
  facesId?: string;
  agent?: boolean;
  useMismatch: boolean;
  disposition: Disposition;
};

type Ledger = {
  assets: Asset[];
  people: typeof people;
  edges: Edge[];
  findings: Finding[];
  paths: typeof paths;
  flows: typeof flows;
  observations: typeof observations;
  dirty: boolean;
  patchAsset: (id: string, patch: AssetPatch) => void;
  setFinding: (id: string, state: FindingState) => void;
  addAsset: (input: NewAssetInput) => string;
  removeAsset: (id: string) => void;
  reset: () => void;
};

function emptyPersisted(): Persisted {
  return { version: 1, overrides: {}, findingState: {}, customAssets: [], customEdges: [] };
}

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeOverrides(value: unknown): Record<string, AssetPatch> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, AssetPatch> = {};
  for (const [id, raw] of Object.entries(value).slice(0, 200)) {
    if (!raw || typeof raw !== "object") continue;
    const patch = raw as AssetPatch;
    const next: AssetPatch = {};
    if (patch.ownerId === null) next.ownerId = null;
    else if (typeof patch.ownerId === "string" && people.some((person) => person.id === patch.ownerId)) {
      next.ownerId = patch.ownerId;
    }
    const purpose = clip(patch.purpose, 240);
    const notes = clip(patch.notes, 2000);
    if (purpose) next.purpose = purpose;
    if (notes) next.notes = notes;
    if (typeof patch.useMismatch === "boolean") next.useMismatch = patch.useMismatch;
    if (patch.disposition === "keep" || patch.disposition === "retire") next.disposition = patch.disposition;
    if (Object.keys(next).length > 0) result[id] = next;
  }
  return result;
}

function sanitizeFindingState(value: unknown): Record<string, FindingState> {
  if (!value || typeof value !== "object") return {};
  const allowed = new Set(seedFindings.map((finding) => finding.id));
  const result: Record<string, FindingState> = {};
  for (const [id, state] of Object.entries(value)) {
    if (!allowed.has(id)) continue;
    if (state === "open" || state === "acknowledged" || state === "exception") result[id] = state;
  }
  return result;
}

function sanitizeAssets(value: unknown): Asset[] {
  if (!Array.isArray(value)) return [];
  const assets: Asset[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Asset;
    if (typeof candidate.id !== "string" || !candidate.id.startsWith("rec-")) continue;
    if (!KINDS.has(candidate.kind) || !ZONES.has(candidate.zone)) continue;
    const name = clip(candidate.name, 80);
    const team = clip(candidate.team, 80);
    const purpose = clip(candidate.purpose, 240);
    const observedUse = clip(candidate.observedUse, 240);
    const location = clip(candidate.location, 80);
    if (!name || !team || !purpose || !observedUse || !location) continue;
    assets.push({
      id: candidate.id,
      name,
      kind: candidate.kind,
      zone: candidate.zone,
      disposition: candidate.disposition === "retire" ? "retire" : "keep",
      team,
      purpose,
      observedUse,
      environment: ["production", "staging", "corporate", "vendor"].includes(candidate.environment)
        ? candidate.environment
        : "production",
      criticality: "standard",
      exposure: ["internet", "partner", "site", "none"].includes(candidate.exposure) ? candidate.exposure : "none",
      lastSeen: AS_OF_SAFE,
      utilization: 0,
      location,
      ownerId: people.some((person) => person.id === candidate.ownerId) ? candidate.ownerId : undefined,
      agent: typeof candidate.agent === "boolean" ? candidate.agent : undefined,
      useMismatch: candidate.useMismatch === true,
      notes: clip(candidate.notes, 2000),
      recorded: true,
    });
  }
  return assets;
}

const AS_OF_SAFE = "2026-11-12";

function sanitizeEdges(value: unknown, assets: Asset[]): Edge[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set(assets.map((asset) => asset.id));
  const edges: Edge[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const edge = raw as Edge;
    if (typeof edge.id !== "string" || typeof edge.from !== "string" || typeof edge.to !== "string") continue;
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    edges.push({ id: edge.id, from: edge.from, to: edge.to, relation: "reaches" });
  }
  return edges;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed.version !== 1) return emptyPersisted();
    const customAssets = sanitizeAssets(parsed.customAssets);
    return {
      version: 1,
      overrides: sanitizeOverrides(parsed.overrides),
      findingState: sanitizeFindingState(parsed.findingState),
      customAssets,
      customEdges: sanitizeEdges(parsed.customEdges, [...seedAssets, ...customAssets]),
    };
  } catch {
    return emptyPersisted();
  }
}

function applyOverride(asset: Asset, override?: AssetPatch): Asset {
  if (!override) return asset;
  return {
    ...asset,
    ownerId: override.ownerId === null ? undefined : (override.ownerId ?? asset.ownerId),
    purpose: override.purpose ?? asset.purpose,
    notes: override.notes ?? asset.notes,
    useMismatch: override.useMismatch ?? asset.useMismatch,
    disposition: override.disposition ?? asset.disposition,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "patch": {
      if (state.customAssets.some((asset) => asset.id === action.id)) {
        return {
          ...state,
          customAssets: state.customAssets.map((asset) =>
            asset.id === action.id ? applyOverride(asset, action.patch) : asset,
          ),
        };
      }
      const prev = state.overrides[action.id] ?? {};
      return { ...state, overrides: { ...state.overrides, [action.id]: { ...prev, ...action.patch } } };
    }
    case "finding":
      return { ...state, findingState: { ...state.findingState, [action.id]: action.state } };
    case "add":
      return {
        ...state,
        customAssets: [...state.customAssets, action.asset],
        customEdges: action.edge ? [...state.customEdges, action.edge] : state.customEdges,
      };
    case "remove":
      return {
        ...state,
        customAssets: state.customAssets.filter((asset) => asset.id !== action.id),
        customEdges: state.customEdges.filter((edge) => edge.from !== action.id && edge.to !== action.id),
      };
    case "reset":
      return emptyPersisted();
    default:
      return state;
  }
}

function danglingCheck(assets: Asset[], edges: Edge[], findings: Finding[]) {
  const ids = new Set(assets.map((asset) => asset.id));
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) console.warn("Dangling edge", edge.id);
  }
  for (const finding of findings) {
    for (const id of finding.assetIds) {
      if (!ids.has(id)) console.warn("Dangling finding", finding.id, id);
    }
  }
  for (const path of paths) {
    for (const step of path.steps) {
      if (!ids.has(step.assetId)) console.warn("Dangling path step", path.id, step.assetId);
    }
  }
  for (const flow of flows) {
    for (const stage of flow.stages) {
      for (const id of stage.assetIds) {
        if (!ids.has(id)) console.warn("Dangling flow stage", flow.id, id);
      }
    }
  }
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<Ledger>(() => {
    const assets = [
      ...seedAssets.map((asset) => applyOverride(asset, state.overrides[asset.id])),
      ...state.customAssets,
    ];
    const ids = new Set(assets.map((asset) => asset.id));
    const edges = [...seedEdges, ...state.customEdges].filter((edge) => ids.has(edge.from) && ids.has(edge.to));
    const findings = seedFindings.map((finding) => ({
      ...finding,
      state: state.findingState[finding.id] ?? finding.state,
    }));
    if (import.meta.env.DEV) danglingCheck(assets, edges, findings);
    const dirty =
      Object.keys(state.overrides).length > 0 ||
      Object.keys(state.findingState).length > 0 ||
      state.customAssets.length > 0;
    return {
      assets,
      people,
      edges,
      findings,
      paths,
      flows,
      observations,
      dirty,
      patchAsset: (id, patch) => dispatch({ type: "patch", id, patch }),
      setFinding: (id, findingState) => dispatch({ type: "finding", id, state: findingState }),
      addAsset: (input) => {
        const id = `rec-${crypto.randomUUID().slice(0, 8)}`;
        const asset: Asset = {
          id,
          name: input.name.trim().slice(0, 80),
          kind: input.kind,
          zone: input.zone,
          disposition: input.disposition,
          team: input.team.trim().slice(0, 80),
          purpose: input.purpose.trim().slice(0, 240),
          observedUse: input.observedUse.trim().slice(0, 240),
          environment: input.environment,
          criticality: "standard",
          exposure: input.exposure,
          lastSeen: AS_OF_SAFE,
          utilization: 0,
          location: input.location.trim().slice(0, 80),
          ownerId: input.ownerId,
          agent: input.agent,
          useMismatch: input.useMismatch,
          recorded: true,
        };
        const faces = input.facesId && ids.has(input.facesId) && input.facesId !== id ? input.facesId : undefined;
        const edge = faces ? { id: `e-${id}`, from: id, to: faces, relation: "reaches" as const } : undefined;
        dispatch({ type: "add", asset, edge });
        return id;
      },
      removeAsset: (id) => dispatch({ type: "remove", id }),
      reset: () => dispatch({ type: "reset" }),
    };
  }, [state]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): Ledger {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside LedgerProvider");
  return value;
}
