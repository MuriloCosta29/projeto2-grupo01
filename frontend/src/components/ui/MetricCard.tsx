import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "blue" | "green" | "orange" | "cyan";
};

export function MetricCard({
  label,
  value,
  icon,
  tone = "blue",
}: MetricCardProps) {
  const isLongTextValue = typeof value === "string" && value.length > 4;

  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <strong className={isLongTextValue ? "compact-value" : ""}>{value}</strong>
      <small>{label}</small>
    </article>
  );
}
