/**
 * @file app-shell.tsx
 * @description Application frame: collapsible sidebar, mobile sheet navigation, Ctrl-K command palette, and page transitions.
 * @architecture Client shell rendered by the dashboard layout. Sidebar collapse state persists to localStorage; sidebar content (nav, projects, profile) is reused on desktop and mobile.
 */
"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Clock,
  List,
  MagnifyingGlass,
  Gear,
  Star,
  CaretLeft,
  CaretRight,
  Plus,
  ArrowSquareOut,
  FolderOpen,
} from "@phosphor-icons/react";
import { useProjects } from "@/hooks/use-projects";
import { SidebarProject } from "./sidebar-project";
import { ProfileModal } from "./profile-modal";
import { CommandMenu } from "./command-menu";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * @constant SIDEBAR_KEY
 * @desc    localStorage key persisting the sidebar collapsed state
 */
const SIDEBAR_KEY = "nexus:sidebar-collapsed";

/**
 * @constant navigation
 * @desc    Primary nav routes rendered as icon + label + href tuples
 */
const navigation = [
  [BookOpen, "Home", "/"],
  [Clock, "Recent", "/recent"],
  [Star, "Favorites", "/favorites"],
  [FolderOpen, "Projects", "/projects"],
] as const;

/* ─── Sidebar content ─────────────────────────────────── */

/**
 * @desc    Sidebar contents shared by desktop and mobile: logo, search, nav, projects, settings, profile
 * @param   {Object} props - Pathname, collapse flag, navigation callbacks, and session user
 * @returns {JSX.Element} The sidebar content
 */
function SidebarContent({
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapse,
  user,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const { data: projects = [] } = useProjects();

  /* Shared class builders */
  const navItemClass = (active: boolean) =>
    [
      "flex items-center rounded-lg text-sm transition-colors",
      collapsed ? "size-10 justify-center" : "gap-3 px-2 py-2 w-full",
      active
        ? "bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white shadow-sm"
        : "text-[#6247aa] hover:bg-[#dec9e9]",
    ].join(" ");

  return (
    /* When collapsed: items-center so every child is horizontally centred
       with no need for mx-auto or per-section justify-center wrappers */
    <div
      className={`flex h-full flex-col py-4 ${collapsed ? "items-center" : "px-3"}`}
    >
      {/* ── Logo ── */}
      <div
        className={`mb-4 flex items-center ${collapsed ? "" : "w-full justify-between"}`}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
        >
          <Image
            src="/nexus-icon-96x96.png"
            alt="Nexus"
            width={26}
            height={26}
            className="shrink-0 rounded-md"
            priority
          />
          {!collapsed && <span className="font-nunito font-bold">Nexus</span>}
        </Link>

        {!collapsed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onToggleCollapse}
                  aria-label="Collapse sidebar"
                  className="flex size-7 items-center justify-center rounded-md text-[#9163cb] transition-colors hover:bg-[#dec9e9] hover:text-[#6247aa]"
                />
              }
            >
              <CaretLeft className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ── Search ── */}
      {!collapsed ? (
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
                bubbles: true,
              }),
            );
          }}
          className="radiant-input-wrapper relative mb-4 flex w-full cursor-pointer items-center rounded-lg"
        >
          <div className="radiant-input-glow rounded-lg" />
          <div className="radiant-input-border z-20 rounded-lg" />
          <MagnifyingGlass className="pointer-events-none absolute top-2.5 left-3 z-10 size-4 text-[#815ac0]" />
          <span className="relative z-10 flex h-9 w-full items-center rounded-lg bg-white pl-9 pr-10 text-left text-sm text-[#9163cb] shadow-[inset_0_0_0_1px_#dec9e9] focus:bg-white/90">
            Search…
          </span>
          <span className="pointer-events-none absolute top-2.5 right-3 z-10 text-xs text-[#9163cb]">
            ⌘ K
          </span>
        </button>
      ) : (
        <button
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
                bubbles: true,
              }),
            );
          }}
          aria-label="Search"
          title="Search"
          className="mb-1 flex size-10 items-center justify-center rounded-lg text-[#6247aa] transition-colors hover:bg-[#dec9e9]"
        >
          <MagnifyingGlass className="size-[18px]" />
        </button>
      )}

      {/* ── Main nav ── */}
      <nav className={`space-y-0.5 ${collapsed ? "" : "w-full"}`}>
        {navigation.map(([Icon, label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={navItemClass(pathname === href)}
          >
            <Icon
              className={collapsed ? "size-[18px] shrink-0" : "size-4 shrink-0"}
            />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* ── Projects (expanded only) ── */}
      {!collapsed && (
        <>
          <div className="mt-6 flex w-full items-center px-2">
            <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#815ac0]">
              Projects
            </span>
            <Link
              href="/projects"
              onClick={onNavigate}
              aria-label="Open all projects"
              title="Open all projects"
              className="ml-2 flex size-5 items-center justify-center rounded-md text-[#815ac0] transition-colors hover:bg-[#dec9e9] hover:text-[#6247aa]"
            >
              <ArrowSquareOut className="size-3.5" weight="bold" />
            </Link>
            <div className="flex-1" />
            <CreateProjectDialog
              trigger={
                <button
                  aria-label="Add project"
                  title="Add project"
                  className="flex size-5 items-center justify-center rounded-md text-[#815ac0] transition-colors hover:bg-[#dec9e9] hover:text-[#6247aa]"
                >
                  <Plus className="size-3.5" weight="bold" />
                </button>
              }
            />
          </div>
          <div className="mt-1.5 w-full space-y-0.5">
            {projects.map((project) => (
              <SidebarProject
                key={project.id}
                project={project}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Bottom actions ── */}
      <div className={`mt-auto space-y-0.5 ${collapsed ? "" : "w-full"}`}>
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed ? "Settings" : undefined}
          className={navItemClass(pathname === "/settings")}
        >
          <Gear
            className={collapsed ? "size-[18px] shrink-0" : "size-4 shrink-0"}
          />
          {!collapsed && "Settings"}
        </Link>
        {!collapsed && <CreateProjectDialog compact />}
      </div>

      {/* ── User Banner ── */}
      {user && (
        <div className={`mt-4 ${collapsed ? "px-1" : ""}`}>
          <ProfileModal user={user} collapsed={collapsed} />
        </div>
      )}
    </div>
  );
}

/* ─── App shell ───────────────────────────────────────── */

/**
 * @desc    Render the app frame: sidebar, mobile header, and animated page content
 * @param   {{children: React.ReactNode; user?: Object}} props - Page content and session user
 * @returns {JSX.Element} The app shell
 */
export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  // Initialise from localStorage to avoid flash on reload
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" as const };

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  const sidebarWidth = collapsed ? 56 : 230;

  return (
    <div
      className="min-h-screen md:grid"
      style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
    >
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeInOut" }
        }
        className="relative sticky top-0 hidden h-screen shrink-0 border-r border-[#dec9e9] bg-[#f8f4fb] md:block"
        style={{ width: sidebarWidth }}
      >
        {/* overflow-hidden on inner wrapper clips content during width animation
            without clipping the absolutely-positioned border pill */}
        <div className="h-full overflow-hidden">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={reduceMotion ? false : { x: -12, opacity: 0 }}
            transition={transition}
            className="h-full"
          >
            <SidebarContent
              pathname={pathname}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((c) => !c)}
              user={user}
            />
          </motion.div>
        </div>

        {/* Floating pill — half outside the right border when collapsed */}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand sidebar"
                  className="absolute top-[22px] -right-3 z-30 flex size-6 items-center justify-center rounded-full border border-[#dec9e9] bg-[#f8f4fb] text-[#9163cb] shadow-sm transition-colors hover:bg-[#dec9e9] hover:text-[#6247aa]"
                />
              }
            >
              <CaretRight className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Expand sidebar</TooltipContent>
          </Tooltip>
        )}
      </motion.aside>

      {/* Main content area */}
      <main className="min-w-0">
        {/* Command palette (Ctrl+K) */}
        <CommandMenu user={user} />

        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex h-15 items-center gap-3 border-b border-[#dec9e9] bg-[#f8f4fb]/90 px-4 backdrop-blur-md md:hidden">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                />
              }
            >
              <List />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[230px] max-w-[85vw] bg-[#f8f4fb] p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent
                pathname={pathname}
                onNavigate={() => setIsMobileNavOpen(false)}
                user={user}
              />
            </SheetContent>
          </Sheet>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={transition}
            className="mx-auto max-w-6xl px-5 py-8 md:px-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
