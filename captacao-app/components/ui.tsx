import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-surface ${className}`}>{children}</div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "accent" | "warn";
}) {
  const cor =
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-2 text-2xl font-semibold ${cor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
