import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  kicker,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-[#dec9e9] pb-7",
        className,
      )}
    >
      <div>
        {kicker}
        <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-[#6247aa]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
