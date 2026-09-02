import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export function TooltipButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  className,
  buttonClassName,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "p-1 hover:bg-[#dec9e9]/50 rounded text-[#6247aa]",
              active && "bg-[#dec9e9]/80",
              disabled && "disabled:opacity-50",
              buttonClassName,
              className,
            )}
            aria-label={label}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
