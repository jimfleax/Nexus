"use client";

/**
 * @file page.tsx
 * @description Resource reader page: resolves project/list/resource ids from the URL and renders the resource view.
 */
import { useParams } from "next/navigation";
import { ResourcePage } from "@/components/resource-page";

/**
 * @desc    Render the resource viewer for the resolved ids
 * @returns {JSX.Element} The resource page
 */
export default function Page() {
  const { projectId, listId, resourceId } = useParams<{
    projectId: string;
    listId: string;
    resourceId: string;
  }>();
  return (
    <ResourcePage
      projectId={projectId}
      listId={listId}
      resourceId={resourceId}
    />
  );
}
