import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "./components/Drawer";
import { AS_OF, cx, formatDate, kindLabel, personName } from "./model";
import { go, hrefFor, NAV, parseHash, type Route } from "./router";
import { useLedger } from "./store";
import { Flows } from "./views/Flows";
import { GraphView } from "./views/GraphView";
import { Inventory } from "./views/Inventory";
import { Overview } from "./views/Overview";
import { Paths } from "./views/Paths";
import { Surface } from "./views/Surface";
import { Usage } from "./views/Usage";

export function App() {
  const { dirty, reset } = useLedger();
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [palette, setPalette] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const label = NAV.find((item) => item.view === route.view)?.label ?? "AMXOS";
    document.title = `${label} · AMXOS`;
  }, [route.view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        if (palette) {
          setPalette(false);
          return;
        }
        if (route.asset) closeAsset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, route.asset, route.view, route.path, route.flow]);

  const openAsset = (id: string) => go(route.view, { asset: id, path: route.path, flow: route.flow });
  const closeAsset = () => go(route.view, { path: route.path, flow: route.flow });

  return (
    <div className={cx("shell", route.asset && "with-dossier")}>
      <aside className="rail">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>AMXOS</strong>
            <em>Asset ledger</em>
          </div>
        </div>
        <nav className="nav" aria-label="Ledger">
          {NAV.map((item) => (
            <a
              key={item.view}
              href={hrefFor(item.view)}
              className={cx(route.view === item.view && "active")}
              aria-current={route.view === item.view ? "page" : undefined}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </a>
          ))}
        </nav>
        <div className="rail-foot">
          {dirty && !confirmReset ? (
            <button type="button" className="rail-btn" onClick={() => setConfirmReset(true)}>
              Reset sample edits
            </button>
          ) : null}
          {confirmReset ? (
            <div className="rail-confirm">
              <p>Clear owners, findings, and assets recorded in this browser?</p>
              <button
                type="button"
                className="rail-btn"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                }}
              >
                Reset
              </button>
              <button type="button" className="rail-btn" onClick={() => setConfirmReset(false)}>
                Keep
              </button>
            </div>
          ) : null}
          <p>The sample estate stays. Edits live in this browser.</p>
        </div>
      </aside>
      <main className="main" id="content">
        <div className="topbar">
          <p>
            <strong className="company">Northline Freight</strong>
            <span className="muted"> Sample estate · as of {formatDate(AS_OF)}</span>
          </p>
          <button type="button" className="btn" onClick={() => setPalette(true)}>
            Jump <kbd>Ctrl</kbd> <kbd>K</kbd>
          </button>
        </div>
        {route.view === "overview" && <Overview openAsset={openAsset} />}
        {route.view === "inventory" && <Inventory openAsset={openAsset} selectedId={route.asset} />}
        {route.view === "surface" && <Surface openAsset={openAsset} />}
        {route.view === "graph" && <GraphView openAsset={openAsset} selectedId={route.asset} />}
        {route.view === "paths" && <Paths pathId={route.path} openAsset={openAsset} />}
        {route.view === "usage" && <Usage openAsset={openAsset} />}
        {route.view === "flows" && <Flows flowId={route.flow} openAsset={openAsset} />}
      </main>
      {route.asset ? (
        <Drawer key={route.asset} assetId={route.asset} onClose={closeAsset} openAsset={openAsset} />
      ) : null}
      {palette ? (
        <Palette
          onClose={() => setPalette(false)}
          openAsset={(id) => {
            openAsset(id);
            setPalette(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Palette({
  onClose,
  openAsset,
}: {
  onClose: () => void;
  openAsset: (id: string) => void;
}) {
  const { assets, people } = useLedger();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const views = NAV.filter(
      (item) => !needle || item.label.toLowerCase().includes(needle) || item.hint.toLowerCase().includes(needle),
    ).map((item) => ({ kind: "view" as const, id: item.view, label: item.label, hint: item.hint }));
    const matched = needle
      ? assets
          .filter((asset) => {
            const owner = personName(people, asset.ownerId).toLowerCase();
            return [asset.name, asset.handle, asset.address, asset.team, asset.id, owner]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(needle));
          })
          .slice(0, 8)
          .map((asset) => ({
            kind: "asset" as const,
            id: asset.id,
            label: asset.name,
            hint: asset.handle || asset.address || kindLabel[asset.kind],
          }))
      : [];
    return [...views, ...matched];
  }, [assets, people, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => inputRef.current?.focus(), []);

  const index = items.length === 0 ? 0 : Math.min(active, items.length - 1);

  function choose(itemIndex: number) {
    const item = items[itemIndex];
    if (!item) return;
    if (item.kind === "view") go(item.id);
    else openAsset(item.id);
    onClose();
  }

  return (
    <div className="palette-back" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="Jump"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(items.length - 1, current + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(index);
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <input
          ref={inputRef}
          value={query}
          placeholder="Jump to a view or an asset"
          aria-label="Jump to a view or an asset"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="palette-list" role="listbox">
          {items.length === 0 ? <p className="muted pad">No matching record.</p> : null}
          {items.map((item, itemIndex) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className="hit"
              role="option"
              aria-selected={itemIndex === index}
              onMouseEnter={() => setActive(itemIndex)}
              onClick={() => choose(itemIndex)}
            >
              <span>{item.label}</span>
              <span className="muted">{item.hint}</span>
            </button>
          ))}
        </div>
        <p className="palette-foot">Enter opens the row. Esc closes.</p>
      </div>
    </div>
  );
}
