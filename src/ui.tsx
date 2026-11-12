import type { ReactNode } from "react";
import { cx } from "./model";

export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string;
  title: string;
  lede: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
      {actions ? <div className="head-actions">{actions}</div> : null}
    </header>
  );
}

export function Pill({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={cx("pill", tone)}>{children}</span>;
}

export function Meter({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <span className={cx("meter", width < 15 && "quiet")} aria-hidden="true">
      <span style={{ width: `${width}%` }} />
    </span>
  );
}

export function postureWord(tone: string): string {
  if (tone === "held") return "Held";
  if (tone === "watch") return "Watch";
  if (tone === "repair") return "Repair";
  if (tone === "withdraw") return "Withdraw";
  if (tone === "aligned") return "Aligned";
  if (tone === "drifting") return "Drifting";
  if (tone === "unowned") return "Unowned";
  return tone;
}
