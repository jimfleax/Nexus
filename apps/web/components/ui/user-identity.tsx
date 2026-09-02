import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export function UserIdentity({
  user,
  className,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 overflow-hidden", className)}>
      <UserAvatar user={user} className="size-9 shrink-0" />
      <div className="flex flex-col text-left min-w-0 overflow-hidden">
        <span className="truncate text-sm font-medium text-[#6247aa]">
          {user.name || "User"}
        </span>
        <span className="truncate text-xs text-[#6247aa]/70">
          {user.email || ""}
        </span>
      </div>
    </div>
  );
}
