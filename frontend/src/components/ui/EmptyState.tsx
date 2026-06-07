import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const classes = ["empty-state", compact ? "compact" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action}
    </article>
  );
}
