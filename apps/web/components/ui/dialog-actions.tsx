import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SubmitButton({
  isPending,
  pendingText,
  disabled,
  children,
  className,
}: {
  isPending: boolean;
  pendingText: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled || isPending}
      className={cn(
        "bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm",
        className,
      )}
    >
      {isPending && <Spinner className="mr-1.5 size-4" />}
      {isPending ? pendingText : children}
    </Button>
  );
}

export function CancelButton({
  onCancel,
  disabled,
}: {
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={disabled}
      className="border-[#dec9e9]"
    >
      Cancel
    </Button>
  );
}
