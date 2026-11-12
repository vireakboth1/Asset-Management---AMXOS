import { doorPosture, exposureLabel, formatDate, lifecycle, personName, downstream } from "../model";
import { useLedger } from "../store";
import type { Asset, Posture } from "../types";
import { PageHead, Pill, postureWord } from "../ui";

const postureRank: Record<Posture, number> = { withdraw: 0, repair: 1, watch: 2, held: 3 };

export function Surface({ openAsset }: { openAsset: (id: string) => void }) {
  const { assets, people, edges, findings } = useLedger();
  const doors = assets
    .filter((asset) => asset.kind === "domain" || asset.kind === "saas")
    .map((door) => ({ door, posture: doorPosture(door, assets, people, edges, findings) }))
    .sort((a, b) => postureRank[a.posture] - postureRank[b.posture] || a.door.name.localeCompare(b.door.name));

  return (
    <div>
      <PageHead
        kicker="External estate"
        title="Surface"
        lede="Public, partner, and vendor names, and the internal systems they still reach."
      />
      <ul className="legend">
        <li>
          <Pill tone="held">Held</Pill> Owner, use, and findings are quiet along the path.
        </li>
        <li>
          <Pill tone="watch">Watch</Pill> Something along the path has drifted.
        </li>
        <li>
          <Pill tone="repair">Repair</Pill> This name has an open high finding.
        </li>
        <li>
          <Pill tone="withdraw">Withdraw</Pill> A retired asset is still on the path.
        </li>
      </ul>
      <div className="doors surface-doors">
        {doors.map(({ door, posture }) => (
          <DoorCard key={door.id} door={door} posture={posture} openAsset={openAsset} />
        ))}
      </div>
    </div>
  );
}

function DoorCard({
  door,
  posture,
  openAsset,
}: {
  door: Asset;
  posture: Posture;
  openAsset: (id: string) => void;
}) {
  const { assets, people, edges, findings } = useLedger();
  const ids = new Set([door.id, ...downstream(door.id, edges)]);
  const related = assets.filter((asset) => ids.has(asset.id) && asset.id !== door.id);
  const address = related.find((asset) => asset.kind === "address");
  const certificate = related.find((asset) => asset.kind === "certificate");
  const systems = related.filter((asset) => asset.zone === "edge" || asset.zone === "internal" || asset.zone === "data");
  const open = findings.filter(
    (finding) => finding.state === "open" && finding.assetIds.some((id) => ids.has(id)),
  );
  const onDoor = open.filter((finding) => finding.assetIds.includes(door.id));
  const further = open.filter((finding) => !finding.assetIds.includes(door.id));

  return (
    <article className="door card-door">
      <div className="door-top">
        <button type="button" className="name-btn" onClick={() => openAsset(door.id)}>
          {door.name}
        </button>
        {door.handle ? <span className="handle">{door.handle}</span> : null}
        <Pill tone={posture}>{postureWord(posture)}</Pill>
        <Pill tone={lifecycle(door, people)}>{postureWord(lifecycle(door, people))}</Pill>
      </div>
      <p className="muted">
        {exposureLabel[door.exposure]} · {personName(people, door.ownerId)} · {door.team}
        {address ? ` · ${address.address}` : ""}
        {certificate?.certExpires ? ` · certificate ${formatDate(certificate.certExpires)}` : ""}
      </p>
      <p>{door.purpose}</p>
      <p className="reaches">
        {systems.length === 0 ? (
          "No path from this name into the estate."
        ) : (
          <>
            Reaches{" "}
            {systems.map((asset, index) => (
              <span key={asset.id}>
                {index > 0 ? ", " : null}
                <button type="button" className="name-btn" onClick={() => openAsset(asset.id)}>
                  {asset.name}
                </button>
              </span>
            ))}
            .
          </>
        )}
      </p>
      {onDoor.length > 0 ? (
        <ul className="plain tight">
          {onDoor.map((finding) => (
            <li key={finding.id}>
              <Pill tone={finding.severity}>{finding.severity}</Pill> {finding.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No open finding on this name.</p>
      )}
      {further.length > 0 ? (
        <p className="muted">
          Further in: {further[0].title}
          {further.length > 1 ? ` and ${further.length - 1} more` : ""}.
        </p>
      ) : null}
    </article>
  );
}
