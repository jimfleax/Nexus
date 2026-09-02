"use client";

import { searchUrl } from "@/lib/urls";
/**
 * @file command-menu.tsx
 * @description Command palette triggered by Ctrl+K: user info, live search suggestions, navigation, and actions.
 * @architecture Client component rendered by AppShell; manages its own Ctrl+K listener, debounced search via apiClient.search.suggestions, and opens existing create dialogs via controlled open state.
 */
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchKeys } from "@/lib/query-keys";
import { STALE_SHORT } from "@/lib/query-config";
import { signOut } from "@/lib/auth";
import {
  House,
  Star,
  Clock,
  Gear,
  FolderPlus,
  ListPlus,
  Files,
  SignOut,
  MagnifyingGlass,
  ArrowRight,
} from "@phosphor-icons/react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { CreateProjectDialog } from "@/components/projects/project-dialog";
import { CreateListDialog } from "@/components/lists/list-dialog";
import { CreateResourceDialog } from "@/components/resources/resource-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function CommandMenu({ user }: { user?: User }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  /* ── Create dialog state ─────────────────────────── */
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);

  /* ── Logout confirmation ─────────────────────────── */
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const router = useRouter();

  /* ── Ctrl+K listener ─────────────────────────────── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  /* ── Live search suggestions (debounced) ─────────── */
  const debouncedSearch = useDebouncedValue(search);

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: searchKeys.suggestions(debouncedSearch),
    queryFn: () => apiClient.search.suggestions(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: STALE_SHORT,
  });

  /* ── Navigation handler ──────────────────────────── */
  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  /* ── Search submit handler ───────────────────────── */
  const handleSearchSubmit = useCallback(() => {
    if (!search.trim()) return;
    setOpen(false);
    router.push(searchUrl(search.trim()));
  }, [search, router]);

  /* ── Open create dialog (close palette first) ────── */
  const openCreate = useCallback((type: "project" | "list" | "resource") => {
    setOpen(false);
    // Small delay to let the palette close animation finish
    requestAnimationFrame(() => {
      if (type === "project") setProjectDialogOpen(true);
      else if (type === "list") setListDialogOpen(true);
      else if (type === "resource") setResourceDialogOpen(true);
    });
  }, []);

  /* ── Logout handler ──────────────────────────────── */
  const handleLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
    setOpen(false);
    void signOut();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* ── User banner ── */}
        {user && (
          <div className="flex items-center gap-3 border-b border-[#dec9e9] px-3 py-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={36}
                height={36}
                className="shrink-0 rounded-full"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-sm font-semibold text-white">
                {user.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-[#6247aa]">
                {user.name}
              </span>
              {user.email && (
                <span className="truncate text-xs text-[#9163cb]">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        )}

        <CommandInput
          placeholder="Search projects, lists, resources..."
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              handleSearchSubmit();
            }
          }}
        />

        <CommandList>
          <CommandEmpty>
            {suggestionsLoading ? "Searching..." : "No results found."}
          </CommandEmpty>

          {/* ── Live search results ── */}
          {suggestions.length > 0 && (
            <CommandGroup heading="Search Results">
              {suggestions.map((title) => (
                <CommandItem
                  key={title}
                  value={`search:${title}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(searchUrl(title));
                  }}
                >
                  <MagnifyingGlass className="text-[#815ac0]" />
                  <span className="truncate">{title}</span>
                  <CommandShortcut>
                    <ArrowRight className="size-3" />
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Navigation ── */}
          <CommandGroup heading="Navigation">
            <CommandItem value="nav:home" onSelect={() => navigateTo("/")}>
              <House className="text-[#815ac0]" />
              <span>Home</span>
              <CommandShortcut>⌘1</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="nav:favorites"
              onSelect={() => navigateTo("/favorites")}
            >
              <Star className="text-[#815ac0]" />
              <span>Favorites</span>
              <CommandShortcut>⌘2</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="nav:recent"
              onSelect={() => navigateTo("/recent")}
            >
              <Clock className="text-[#815ac0]" />
              <span>Recent</span>
              <CommandShortcut>⌘3</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="nav:settings"
              onSelect={() => navigateTo("/settings")}
            >
              <Gear className="text-[#815ac0]" />
              <span>Settings</span>
              <CommandShortcut>⌘4</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* ── Actions ── */}
          <CommandGroup heading="Actions">
            <CommandItem
              value="action:new-project"
              onSelect={() => openCreate("project")}
            >
              <FolderPlus className="text-[#815ac0]" />
              <span>New Project</span>
            </CommandItem>
            <CommandItem
              value="action:new-list"
              onSelect={() => openCreate("list")}
            >
              <ListPlus className="text-[#815ac0]" />
              <span>New List</span>
            </CommandItem>
            <CommandItem
              value="action:new-resource"
              onSelect={() => openCreate("resource")}
            >
              <Files className="text-[#815ac0]" />
              <span>New Resource</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem
              value="action:logout"
              onSelect={() => {
                setOpen(false);
                requestAnimationFrame(() => {
                  setLogoutConfirmOpen(true);
                });
              }}
              className="text-[#a83232] data-[selected]:bg-red-50 data-[selected]:text-[#a83232]"
            >
              <SignOut className="text-[#a83232]" />
              <span>Logout</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* ── Create dialogs (controlled) ── */}
      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        trigger={null}
      />
      <CreateListDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
        trigger={null}
      />
      <CreateResourceDialog
        open={resourceDialogOpen}
        onOpenChange={setResourceDialogOpen}
        trigger={null}
      />

      {/* ── Logout confirmation ── */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              className="border-[#dec9e9]"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
