import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-surface card-shadow ${className}`}>{children}</div>;
}

export function Stat({
  label, value, hint, tone = "ink",
}: {
  label: string; value: string; hint?: string; tone?: "ink" | "accent" | "warn" | "neg";
}) {
  const cor = tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : tone === "neg" ? "text-neg" : "text-ink";
  const barra = tone === "accent" ? "bg-accent" : tone === "warn" ? "bg-warn" : tone === "neg" ? "bg-neg" : "bg-ink/30";
  return (
    <div className="relative overflow-hidden rounded-xl border bg-surface px-5 py-4 card-shadow card-hover">
      <span className={`absolute left-0 top-0 h-full w-1 ${barra}`} aria-hidden />
      <div className="eyebrow">{label}</div>
      <div className={`num mt-2 text-2xl font-semibold tracking-tight ${cor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
