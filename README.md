# Nexus

Nexus is a workspace application designed to help you organize resources, ideas, and references into structured projects. It provides a centralized hub to save, categorize, and access information across different formats.

## Overview

Nexus organizes your materials using a simple hierarchy:

- **Projects**: The top-level workspaces for specific topics or initiatives.
- **Lists**: Custom groupings within a project to categorize your materials.
- **Resources**: The actual content you save to your lists.

You can save several types of resources to your lists:

- **Markdown Notes**: Write and edit notes directly inside the application.
- **Web Links**: Save URLs to articles, tools, or web references.
- **PDF Documents**: Upload and read PDFs directly in the viewer.
- **Images**: Store image files for visual reference.

Files uploaded to Nexus (such as PDFs and images) are securely stored via an integrated Google Drive connection, while all metadata and notes are managed by the application database.

## Architecture

Nexus is structured as a monorepo consisting of:

- **Web App** (`apps/web`): The frontend user interface.
- **API** (`apps/api`): The backend server managing business logic, multi-tenant data isolation, and storage integrations.
- **Shared** (`packages/shared`): A common package for shared types and schemas used by both the frontend and backend.

## Local Development

You can start the entire application (both the frontend and API) by running the provided shell script from the repository root:

```bash
./run.sh
```

For a comprehensive guide on environment variables, testing, and workspace-specific commands, refer to the `AGENTS.md` file located in the root of the repository.
