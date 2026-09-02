import React from "react";
import type { Resource } from "@nexus/shared";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowsOutSimple } from "@phosphor-icons/react";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { RESOURCE_ICONS } from "@/lib/resource-meta";

export function ViewerHeader({
  resource,
  actions,
  onFullscreen,
}: {
  resource: Resource;
  actions?: React.ReactNode;
  onFullscreen?: () => void;
}) {
  const Icon = RESOURCE_ICONS[resource.type];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dec9e9] bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-[#f8f4fb] text-[#6247aa]">
          {Icon && <Icon className="size-5" />}
        </div>
        <div>
          <h2 className="font-semibold text-[#6247aa]">{resource.title}</h2>
          <p className="text-xs text-[#6247aa]/70">{resource.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <CopyButton
          text={resource.content || resource.url || ""}
          label="Copy content"
          copiedLabel="Copied"
          className="h-8 w-8 rounded p-0 text-[#6247aa] hover:bg-[#f8f4fb]"
        />
        {onFullscreen && (
          <TooltipButton
            icon={<ArrowsOutSimple className="size-4" />}
            label="Fullscreen"
            onClick={onFullscreen}
            buttonClassName="h-8 w-8 rounded p-0 text-[#6247aa] hover:bg-[#f8f4fb]"
          />
        )}
      </div>
    </div>
  );
}
