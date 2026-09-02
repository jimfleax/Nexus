import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  className,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  className?: string;
}) {
  const name = user.name || "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <Avatar className={cn("size-8", className)}>
      {user.image && <AvatarImage src={user.image} alt={name} />}
      <AvatarFallback className="bg-[#dec9e9] text-xs font-semibold text-[#6247aa]">
        {initials || (user.email ? user.email[0].toUpperCase() : "U")}
      </AvatarFallback>
    </Avatar>
  );
}
