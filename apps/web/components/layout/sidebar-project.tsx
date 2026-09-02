import { projectUrl, listUrl } from "@/lib/urls";
/**
 * @file sidebar-project.tsx
 * @description Sidebar entry for a project, expanding its lists when active.
 * @architecture Server component used within SidebarContent; fetches lists via useLists to build the nested nav.
 */
import Link from "next/link";
import { motion } from "motion/react";
import type { Project } from "@nexus/shared";
import { useLists } from "@/hooks/use-lists";

/**
 * @desc    Render a project link with an expanding list subsection
 * @param   {{project: Project; pathname: string; onNavigate?: () => void}} props - Project, current path, and nav callback
 * @returns {JSX.Element} The sidebar project entry
 */
export function SidebarProject({
  project,
  pathname,
  onNavigate,
}: {
  project: Project;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = pathname.startsWith(projectUrl(project.id));
  const { data: lists = [] } = useLists(project.id);

  return (
    <div>
      <Link
        href={projectUrl(project.id)}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
          isActive
            ? "bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white shadow-sm"
            : "text-[#6247aa] hover:bg-[#dec9e9]"
        }`}
      >
        <span className="w-4 shrink-0 text-center text-base leading-none">
          {project.icon}
        </span>
        <span className="truncate">{project.name}</span>
      </Link>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="ml-7 overflow-hidden border-l border-[#dec9e9] pl-2"
        >
          {lists.map((list) => (
            <Link
              key={list.id}
              href={listUrl(project.id, list.id)}
              onClick={onNavigate}
              className="block rounded px-2 py-1.5 text-xs text-[#6247aa] transition-colors hover:underline hover:underline-offset-2"
            >
              {list.name}
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
