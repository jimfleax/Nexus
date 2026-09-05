"use client";

/**
 * @file command.tsx
 * @description Command menu primitives built on cmdk + Base UI Dialog. Provides CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty, CommandSeparator, and CommandShortcut.
 * @architecture UI molecule wrapping cmdk primitives with the project's Base UI Dialog and purple/lavender theme tokens.
 */
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/* ─── Command root ─────────────────────────────────── */

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-[#6247aa]",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

/* ─── CommandDialog — Base UI Dialog + cmdk ────────── */

type CommandDialogProps = React.ComponentProps<typeof Dialog> & {
  children: React.ReactNode;
  contentClassName?: string;
};

function CommandDialog({
  children,
  contentClassName,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "overflow-hidden p-0 shadow-xl sm:top-[20%] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-0",
          contentClassName,
        )}
      >
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[.12em] [&_[cmdk-group-heading]]:text-[#815ac0] [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-1.5 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* ─── CommandInput ─────────────────────────────────── */

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="radiant-input-wrapper relative mx-1.5 mt-1.5 rounded-lg"
    cmdk-input-wrapper=""
  >
    <div className="radiant-input-glow rounded-lg" />
    <div className="radiant-input-border z-20 rounded-lg" />
    <MagnifyingGlass className="pointer-events-none absolute top-2.5 left-3 z-10 size-4 text-[#815ac0]" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "relative z-10 flex h-11 w-full rounded-lg border-none bg-white/90 py-3 pl-9 pr-3 text-sm text-[#6247aa] outline-none placeholder:text-[#9163cb]/60 focus:bg-white",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

/* ─── CommandList ──────────────────────────────────── */

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[340px] overflow-y-auto overflow-x-hidden scroll-py-2 px-1.5 pb-1.5 pt-2",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

/* ─── CommandEmpty ─────────────────────────────────── */

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-sm text-[#9163cb]"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

/* ─── CommandGroup ─────────────────────────────────── */

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden text-foreground [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

/* ─── CommandSeparator ─────────────────────────────── */

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1 h-px bg-[#dec9e9]", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

/* ─── CommandItem ──────────────────────────────────── */

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2.5 select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-[#dec9e9] data-[selected=true]:text-[#6247aa] data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

/* ─── CommandShortcut ──────────────────────────────── */

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "ml-auto text-[11px] tracking-wider text-[#9163cb]",
        className,
      )}
      {...props}
    />
  );
}
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandShortcut,
  CommandItem,
  CommandSeparator,
};
