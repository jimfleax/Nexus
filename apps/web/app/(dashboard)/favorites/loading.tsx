/**
 * @file loading.tsx
 * @description Loading state for the favorites page.
 * @architecture Displays skeleton loaders for the favorites resource list.
 */
import { PageHeader } from "@/components/ui/page-header";
import { ResourceList } from "@/components/ui/resource-list";

/**
 * @desc    Renders a loading skeleton for the Favorites page
 * @returns {JSX.Element} The loading UI component
 */
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
