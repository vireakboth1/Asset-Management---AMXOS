import { useEffect, useState } from "react";
import { cx } from "../model";
import { go } from "../router";
import { useLedger } from "../store";
import { PageHead } from "../ui";

export function Paths({
  pathId,
  openAsset,
}: {
  pathId?: string;
  openAsset: (id: string) => void;
}) {
  const { paths, assets } = useLedger();
  const selected = paths.find((path) => path.id === pathId) ?? paths[0];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [selected.id]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => current + 1);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (index >= selected.steps.length - 1) setPlaying(false);
  }, [index, selected.steps.length]);

  const step = selected.steps[Math.min(index, selected.steps.length - 1)];
  const asset = assets.find((item) => item.id === step.assetId);

  function togglePlay() {
    if (!playing && index >= selected.steps.length - 1) setIndex(0);
    setPlaying((value) => !value);
  }

  return (
    <div>
      <PageHead
        kicker="Routes"
        title="Paths"
        lede="Play one route from the outside in. Each step states the control that is in place, and the gap when there is one."
      />
      <div className="path-layout">
        <ul className="path-list">
          {paths.map((path) => (
            <li key={path.id}>
              <button
                type="button"
                className={cx("path-pick", path.id === selected.id && "active")}
                onClick={() => go("paths", { path: path.id })}
              >
                <strong>{path.title}</strong>
                <span>{path.audience}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="path-stage">
          <p className="kicker">{selected.audience}</p>
          <h2>{selected.title}</h2>
          <p className="lede">{selected.summary}</p>
          <ol className="stepper">
            {selected.steps.map((item, stepIndex) => {
              const stepAsset = assets.find((candidate) => candidate.id === item.assetId);
              return (
                <li key={item.assetId} className={cx(stepIndex === index && "current", stepIndex < index && "done")}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setIndex(stepIndex);
                    }}
                  >
                    <span>{item.phase}</span>
                    <strong>{stepAsset?.name ?? item.assetId}</strong>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="player" aria-live="polite">
            <p className="kicker">
              Step {index + 1} of {selected.steps.length}
              {asset ? ` · ${asset.name}` : ""}
            </p>
            <p className="caption">{step.caption}</p>
            <p>
              <span className="label">In place</span> {step.control}
            </p>
            {step.gap ? (
              <p>
                <span className="label gap">Gap</span> {step.gap}
              </p>
            ) : null}
            <div className="row-actions">
              <button type="button" className="btn" disabled={index === 0} onClick={() => { setPlaying(false); setIndex((value) => Math.max(0, value - 1)); }}>
                Previous
              </button>
              <button type="button" className="btn primary" aria-pressed={playing} onClick={togglePlay}>
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={index >= selected.steps.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setIndex((value) => Math.min(selected.steps.length - 1, value + 1));
                }}
              >
                Next
              </button>
              {asset ? (
                <button type="button" className="btn" onClick={() => openAsset(asset.id)}>
                  Open record
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
