# AMXOS

AMXOS is an asset ledger for one organization. It keeps the internal estate (servers, workstations, identity, data) and the external assets that face it (names, addresses, certificates, partner and vendor services) on the same record, then shows whether ownership and observed use still agree.

The estate you see on first launch is a sample company, Northline Freight. Addresses use the documentation range `203.0.113.0/24`. Records you add, owners you assign, and findings you acknowledge stay in this browser.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints. `npm run build` typechecks and writes a static build to `dist/`.

## What you can do

- **Overview** watches the estate: endpoint check-in, facing names, alignment, and the open finding queue.
- **Inventory** filters every record. **Record an asset** adds an internal endpoint or an external name and, optionally, what it faces.
- **Surface** is the boundary. Each public, partner, or vendor name is Held, Watch, Repair, or Withdraw based on the path behind it.
- **Graph** lays the estate out from external names to data. Select a node to trace the hop, including the address or certificate hidden in the compact view.
- **Paths** plays one route from the outside in. Each step states the control that is in place and the gap when there is one.
- **Usage** lines purpose up against observed use, owner, and capacity.
- **Flows** replays a chain the ledger already knows: a name to the record it reaches, certificate posture, or the yard into the transportation system.

Jump with Ctrl K or Cmd K. Reset sample edits from the rail when you want the original Northline estate back.

## Where the shape comes from

Two references suggested features, and both were adapted to assets the organization already operates.

[Flowsint](https://github.com/reconurge/flowsint) is a graph for investigations: typed entities, relationships, and enrichers chained into a flow. AMXOS keeps that model (name, address, certificate, edge, host, data) and replays it from the ledger. It does not run DNS, WHOIS, or any other lookup.

[FlowViz](https://github.com/davidljohnson/flowviz) plays an attack narrative as a sequence of steps. AMXOS uses the same playback for an exposure path, and each step is written as the control in place and the operational gap. It is a review tool for the estate, not a procedure for breaking into one.
