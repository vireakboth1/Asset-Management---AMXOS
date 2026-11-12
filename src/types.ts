export type Zone = "external" | "edge" | "internal" | "data";

export type Kind =
  | "domain"
  | "address"
  | "certificate"
  | "gateway"
  | "server"
  | "workstation"
  | "identity"
  | "database"
  | "storage"
  | "saas";

export type Environment = "production" | "staging" | "corporate" | "vendor";

export type Criticality = "crown" | "high" | "standard" | "low";

export type Exposure = "internet" | "partner" | "site" | "none";

export type Disposition = "keep" | "retire";

export type Lifecycle = "aligned" | "drifting" | "unowned";

export type Posture = "held" | "watch" | "repair" | "withdraw";

export type FindingState = "open" | "acknowledged" | "exception";

export type Severity = "critical" | "high" | "medium" | "low";

export type Relation =
  | "resolves"
  | "presents"
  | "terminates"
  | "runs"
  | "reads"
  | "authenticates"
  | "reaches";

export type Asset = {
  id: string;
  name: string;
  kind: Kind;
  zone: Zone;
  disposition: Disposition;
  team: string;
  purpose: string;
  observedUse: string;
  environment: Environment;
  criticality: Criticality;
  exposure: Exposure;
  lastSeen: string;
  utilization: number;
  location: string;
  handle?: string;
  address?: string;
  ownerId?: string;
  agent?: boolean;
  os?: string;
  certExpires?: string;
  useMismatch?: boolean;
  notes?: string;
  recorded?: boolean;
};

export type Person = {
  id: string;
  name: string;
  team: string;
  role: string;
  active: boolean;
};

export type Edge = {
  id: string;
  from: string;
  to: string;
  relation: Relation;
};

export type Finding = {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  kind: "ownership" | "exposure" | "hygiene" | "usage" | "certificate";
  assetIds: string[];
  state: FindingState;
};

export type PathStep = {
  assetId: string;
  phase: string;
  caption: string;
  control: string;
  gap?: string;
};

export type ExposurePath = {
  id: string;
  title: string;
  summary: string;
  audience: string;
  steps: PathStep[];
};

export type FlowStage = {
  name: string;
  detail: string;
  assetIds: string[];
};

export type Flow = {
  id: string;
  name: string;
  summary: string;
  stages: FlowStage[];
};

export type Observation = {
  id: string;
  at: string;
  assetId: string;
  text: string;
};

export type AssetPatch = {
  ownerId?: string | null;
  purpose?: string;
  notes?: string;
  useMismatch?: boolean;
  disposition?: Disposition;
};
