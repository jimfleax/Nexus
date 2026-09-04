"use client";
import { resourceUrl } from "@/lib/urls";
/**
 * @file page.tsx
 * @description Search page: full-text search across the workspace driven by the ?q= query param.
 */
import { motion } from "framer-motion";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "boneyard-js/react";
import type { Resource } from "@nexus/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchKeys } from "@/lib/query-keys";
import { useProject } from "@/hooks/use-projects";
import { useList } from "@/hooks/use-lists";

/**
 * @desc    Render a single search result with its breadcrumb context
 * @param   {{r: Resource}} props - The matching resource
 * @returns {JSX.Element} The result row
 */
function SearchResultItem({ r }: { r: Resource }) {
  const { data: p } = useProject(r.projectId);
  const { data: l } = useList(r.projectId, r.listId);

  return (
    <Link
      href={resourceUrl(r.projectId, r.listId, r.id)}
      className="block py-5 hover:bg-[#f8f4fb]"
      data-boneyard="search-result"
    >
      <h2 className="font-medium">{r.title}</h2>
      {r.description && (
        <p className="mt-1 text-sm text-[#6247aa]">{r.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.tags.map((tag) => (
          <span
            key={tag}
            className="rounded px-2 py-0.5 text-xs bg-[#dec9e9] text-[#6247aa]"
          >
            #{tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#815ac0]">
        {p?.name || "Loading project..."} / {l?.name || "Loading list..."}
      </p>
    </Link>
  );
}

/**
 * @desc    Render the search form and results, syncing from the URL query
 * @param   {{searchParams: Promise<{q?: string}>}} props - The page search parameters
 * @returns {JSX.Element} The search UI
 */
export default function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [q, setQ] = useState("");
  const params = use(searchParams);
  const query = params.q || "";

  useEffect(() => {
    setQ(query);
  }, [query]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const { data: results = [], isLoading: loading } = useQuery({
    queryKey: searchKeys.query(query),
    queryFn: () => apiClient.search.query(query),
    enabled: !!query,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <h1 className="font-serif text-4xl">Search</h1>
      <form className="radiant-input-wrapper relative mt-6 w-full max-w-2xl rounded-2xl">
        <div className="radiant-input-glow rounded-2xl" />
        <div className="radiant-input-border z-20 rounded-2xl" />
        <input
          autoFocus
          name="q"
          defaultValue={q}
          placeholder="Search projects, resources, tags, and content"
          className="relative z-10 h-14 w-full rounded-2xl border-none bg-white px-5 text-lg outline-none focus:bg-white/95"
        />
      </form>
      {q && !loading && (
        <p className="mt-5 text-sm text-[#6247aa]">
          {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}
      {!isMounted || loading || results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="mt-4 max-w-3xl divide-y divide-[#dec9e9] flex flex-col gap-2"
        >
          {(loading ? (Array.from({ length: 3 }) as Resource[]) : results).map(
            (item, i) => {
              const isDummy = loading;
              return (
                <Skeleton key={i} name="search-result" loading={loading}>
                  {isDummy ? (
                    <div style={{ minHeight: 61 }} />
                  ) : (
                    <SearchResultItem r={item as Resource} />
                  )}
                </Skeleton>
              );
            },
          )}
        </motion.div>
      ) : null}

      {!loading && q && !results.length && (
        <div className="py-16 text-center">
          <h2 className="font-serif text-xl">No results found</h2>
          <p className="mt-2 text-[#6247aa]">
            Try a title, tag, or another phrase.
          </p>
        </div>
      )}
      {!loading && !q && (
        <div className="py-16 text-center text-[#6247aa]">
          Search across your workspace.
        </div>
      )}
    </>
  );
}
