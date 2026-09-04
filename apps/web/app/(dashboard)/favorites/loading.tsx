import { PageHeader } from "@/components/ui/page-header";
import { ResourceList } from "@/components/ui/resource-list";

export default function Loading() {
  return (
    <>
      <PageHeader
        title="Favorites"
        subtitle="Resources you want close at hand."
      />
      <ResourceList items={[]} isLoading={true} emptyTitle="Loading..." />
    </>
  );
}
