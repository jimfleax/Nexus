import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
    >
      {children}
      {required && <span className="text-[#a83232]">*</span>}
    </label>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel htmlFor={htmlFor} required={required}>
        {label}
      </FormLabel>
      {children}
    </div>
  );
}

export function NativeSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(
        props.className,
        "h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-[#6247aa] outline-none",
      )}
    />
  );
}
