import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  centered?: boolean;
  className?: string;
};

type SurfaceSectionProps = {
  children: ReactNode;
  className?: string;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageShell({
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <main className={cn("min-h-screen bg-background", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
          containerClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  centered = false,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        centered && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-3xl space-y-3", centered && "mx-auto")}>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </section>
  );
}

export function SurfaceSection({
  children,
  className,
}: SurfaceSectionProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-border/80 bg-card shadow-brand-soft",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <SurfaceSection className={cn("p-8 text-center", className)}>
      <div className="mx-auto max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </SurfaceSection>
  );
}
