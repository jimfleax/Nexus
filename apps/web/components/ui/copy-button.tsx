import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  timeoutMs = 2000,
  className,
  variant = "ghost",
  label = "Copy",
  copiedLabel = "Copied",
  hideText = false,
}: {
  text: string;
  timeoutMs?: number;
  className?: string;
  variant?: "ghost" | "outline" | "default" | "secondary";
  label?: string;
  copiedLabel?: string;
  hideText?: boolean;
}) {
  const { copied, copy } = useCopyToClipboard(timeoutMs);

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("gap-1.5 text-xs text-[#6247aa]", className)}
      onClick={() => copy(text)}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {!hideText && (copied ? copiedLabel : label)}
    </Button>
  );
}
