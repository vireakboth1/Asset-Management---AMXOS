import { useEffect, useState } from "react";
import { cx } from "../model";
import { go } from "../router";
import { useLedger } from "../store";
import { PageHead } from "../ui";

export function Flows({
  flowId,
  openAsset,
}: {
  flowId?: string;
  openAsset: (id: string) => void;
}) {
  const { flows, assets } = useLedger();
  const selected = flows.find((flow) => flow.id === flowId) ?? flows[0];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [selected.id]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((current) => current + 1), 1600);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (index >= selected.stages.length - 1) setPlaying(false);
  }, [index, selected.stages.length]);

  function togglePlay() {
    if (!playing && index >= selected.stages.length - 1) setIndex(0);
    setPlaying((value) => !value);
  }

  return (
    <div>
      <PageHead
        kicker="Enrichment"
        title="Flows"
        lede="Replay a chain the ledger already knows. Nothing on this page queries DNS, a certificate log, or a host."
      />
      <div className="path-layout">
        <ul className="path-list">
          {flows.map((flow) => (
            <li key={flow.id}>
              <button
                type="button"
                className={cx("path-pick", flow.id === selected.id && "active")}
                onClick={() => go("flows", { flow: flow.id })}
              >
                <strong>{flow.name}</strong>
                <span>{flow.stages.length} stages</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="path-stage">
          <h2>{selected.name}</h2>
          <p className="lede">{selected.summary}</p>
          <div className="row-actions">
            <button type="button" className="btn primary" aria-pressed={playing} onClick={togglePlay}>
              {playing ? "Pause replay" : "Replay"}
            </button>
          </div>
          <ol className="timeline">
            {selected.stages.map((stage, stageIndex) => (
              <li key={stage.name} className={cx(stageIndex === index && "current", stageIndex < index && "done")}>
                <button
                  type="button"
                  className="stage-hit"
                  onClick={() => {
                    setPlaying(false);
                    setIndex(stageIndex);
                  }}
                >
                  <span className="stage-index">{stageIndex + 1}</span>
                  <span>
                    <strong>{stage.name}</strong>
                    <span className="muted">{stage.detail}</span>
                  </span>
                </button>
                <div className="chips">
                  {stage.assetIds.map((id) => {
                    const asset = assets.find((item) => item.id === id);
                    return (
                      <button key={id} type="button" className="chip" onClick={() => openAsset(id)}>
                        {asset?.name ?? id}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
