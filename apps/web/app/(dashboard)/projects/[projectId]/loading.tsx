import { Skeleton } from "boneyard-js/react";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton name="breadcrumb" loading>
        {null}
      </Skeleton>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} name="project-list-card" loading>
            {null}
          </Skeleton>
        ))}
      </div>
    </div>
  );
}
