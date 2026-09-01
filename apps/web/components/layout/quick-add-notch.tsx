/**
 * @file quick-add-notch.tsx
 * @description Floating quick-add button opening a menu to create a project, list, or resource.
 * @architecture Client widget used on the dashboard hero; closes on click-outside or Escape and drives the underlying create dialogs via controlled open state.
 */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, FolderPlus, ListPlus, FilePlus } from "@phosphor-icons/react";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { CreateListDialog } from "@/components/lists/create-list-dialog";
import { CreateResourceDialog } from "@/components/resources/create-resource-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * @desc    Render the quick-add menu and its controlled create dialogs
 * @param   {{className?: string}} props - Optional wrapper class
 * @returns {JSX.Element} The quick-add button and dialog components
 */
export function QuickAddNotch({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<
    "project" | "list" | "resource" | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const options = [
    {
      id: "project",
      label: "New Project",
      icon: FolderPlus,
      action: () => setActiveDialog("project"),
    },
    {
      id: "list",
      label: "New List",
      icon: ListPlus,
      action: () => setActiveDialog("list"),
    },
    {
      id: "resource",
      label: "New Resource",
      icon: FilePlus,
      action: () => setActiveDialog("resource"),
    },
  ] as const;

  return (
    <>
      <div
        ref={containerRef}
        className={`relative z-30 flex flex-col items-end ${className || ""}`}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <motion.button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Add new item"
                className="flex items-center gap-2 overflow-hidden rounded-full border border-white/25 bg-white/10 px-3 py-2 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/20 focus:outline-none"
              />
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isOpen ? "open" : "closed"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Plus
                  className={`size-5 transition-transform ${isOpen ? "rotate-45" : ""}`}
                />
              </motion.div>
            </AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="font-medium text-sm pr-1 whitespace-nowrap"
              >
                Add
              </motion.span>
            )}
          </TooltipTrigger>
          <TooltipContent>Quick add</TooltipContent>
        </Tooltip>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="absolute top-[calc(100%+8px)] right-0 w-48 overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl"
            >
              <div className="flex flex-col py-1">
                {options.map((opt, i) => (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      setTimeout(() => opt.action(), 100);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
                  >
                    <opt.icon className="size-4 text-white/80" weight="bold" />
                    <span className="font-medium">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateProjectDialog
        open={activeDialog === "project"}
        onOpenChange={(open: boolean) => !open && setActiveDialog(null)}
        trigger={null}
      />
      <CreateListDialog
        open={activeDialog === "list"}
        onOpenChange={(open: boolean) => !open && setActiveDialog(null)}
        trigger={null}
      />
      <CreateResourceDialog
        open={activeDialog === "resource"}
        onOpenChange={(open: boolean) => !open && setActiveDialog(null)}
        trigger={null}
      />
    </>
  );
}
