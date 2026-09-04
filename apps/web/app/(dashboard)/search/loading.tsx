"use client";

import { Skeleton } from "boneyard-js/react";

export default function Loading() {
  return (
    <>
      <h1 className="font-serif text-4xl">Search</h1>
      <form className="radiant-input-wrapper relative mt-6 w-full max-w-2xl rounded-2xl">
        <div className="radiant-input-glow rounded-2xl" />
        <div className="radiant-input-border z-20 rounded-2xl" />
        <input
          disabled
          placeholder="Search projects, resources, tags, and content"
          className="relative z-10 h-14 w-full rounded-2xl border-none bg-white px-5 text-lg outline-none focus:bg-white/95 cursor-not-allowed"
        />
      </form>

      <div className="mt-4 max-w-3xl divide-y divide-[#dec9e9] flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} name="search-result" loading={true}>
            {null}
          </Skeleton>
        ))}
      </div>
    </>
  );
}
