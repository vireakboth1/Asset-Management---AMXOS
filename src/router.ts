export const VIEWS = ["overview", "inventory", "surface", "graph", "paths", "usage", "flows"] as const;

export type View = (typeof VIEWS)[number];

export type Route = {
  view: View;
  asset?: string;
  path?: string;
  flow?: string;
};

export const NAV: { view: View; label: string; hint: string }[] = [
  { view: "overview", label: "Overview", hint: "Estate pulse" },
  { view: "inventory", label: "Inventory", hint: "Every record" },
  { view: "surface", label: "Surface", hint: "What faces in" },
  { view: "graph", label: "Graph", hint: "How it connects" },
  { view: "paths", label: "Paths", hint: "Play a route" },
  { view: "usage", label: "Usage", hint: "Owner and purpose" },
  { view: "flows", label: "Flows", hint: "Replay the ledger" },
];

function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value);
}

export function parseHash(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const name = pathPart.replace(/^\//, "").replace(/\/$/, "");
  const view: View = name === "" ? "overview" : isView(name) ? name : "overview";
  const params = new URLSearchParams(queryPart ?? "");
  return {
    view,
    asset: params.get("asset") || undefined,
    path: params.get("path") || undefined,
    flow: params.get("flow") || undefined,
  };
}

export function hrefFor(view: View, extras?: { asset?: string; path?: string; flow?: string }): string {
  const params = new URLSearchParams();
  if (extras?.asset) params.set("asset", extras.asset);
  if (extras?.path) params.set("path", extras.path);
  if (extras?.flow) params.set("flow", extras.flow);
  const query = params.toString();
  const path = view === "overview" ? "/" : `/${view}`;
  return `#${path}${query ? `?${query}` : ""}`;
}

export function go(view: View, extras?: { asset?: string; path?: string; flow?: string }) {
  const next = hrefFor(view, extras);
  if (window.location.hash !== next) window.location.hash = next;
}
