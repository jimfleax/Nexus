import React from "react";

export function ViewerEmptyState({
  icon: IconEl,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
      <IconEl className="mx-auto size-10 text-[#6247aa]" />
      <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
      <p className="mt-2 text-sm text-[#6247aa]">{message}</p>
    </section>
  );
}
