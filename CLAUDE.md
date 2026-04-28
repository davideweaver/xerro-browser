# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based web interface for browsing and managing Graphiti memory graphs. Graphiti is a knowledge graph system that extracts entities, relationships, and facts from conversational data. This browser provides a visual interface to search facts, browse entities, view episodes (raw interactions), and add new memories.

## Architecture

### UI Terminology

This application uses consistent naming for UI areas:

- **Primary Nav** - 75px fixed-width left sidebar with icon-only navigation (Dashboard, Projects, Documents, Memory, Agent Tasks)
- **Secondary Nav** - 380px collapsible sidebar for contextual navigation (changes based on active section)
- **Page** - Primary content region using the Container component pattern
- **Mobile Nav** - Hamburger trigger + Sheet overlay combining both navigation columns

**Component Naming Patterns:**
- Container variants: `Container`, `ContainerTable`, `ContainerToolButton`
- Navigation: `PrimaryNav`, `SecondaryNav`, `MobileNavTrigger`, `MobileNavOverlay`
- Cards: `FactCard`, `EntityCard`, `EpisodeCard`

For complete UI terminology, component naming patterns, and state conventions, see [UI Terminology Guide](docs/design-system/ui-terminology.md).

### Core Data Model

The application works with four main data types from the Graphiti API:

- **Episodes** - Raw interaction data (messages, conversations)
- **Entities** - Extracted people, organizations, locations, projects, etc.
- **Facts** - Searchable knowledge units connecting entities and episodes
- **Entity Edges** - Relationships between entities with temporal validity

All data is scoped by `group_id` (managed via UI graph selector, stored in localStorage).

### API Integration

The `GraphitiService` singleton provides methods for all API operations:

**Search & Episodes:**

- `search()` - Search for facts by query
- `getEpisodes()` - List recent episodes
- `addMessages()` - Add new memories (async processing)

**Entity Operations:**

- `getEntity(uuid)` - Get single entity by UUID
- `listEntities(groupId, limit, cursor)` - List entities with pagination
- `getEntitiesByUuids(uuids)` - Batch entity retrieval

**Relationships:**

- `getEntityEdge(uuid)` - Get entity edge details
- `deleteEntityEdge(uuid)` - Remove relationships

**Management:**

- `createEntity()` - Create entity nodes
- `deleteEpisode()` - Remove episodes
- `healthcheck()` - Server status

**Graph Management:**

- `listGroups()` - List all available graphs with stats
- `deleteGroup(groupId)` - Delete a graph and all its data

API errors are automatically shown to users via toast notifications.

**Agent Tasks (xerro-service):**

The application also integrates with xerro-service for agent task management:

- `agentTasksService.listTasks(enabled?, task?)` - List scheduled tasks
- `agentTasksService.getTask(id)` - Get task details
- `agentTasksService.getTaskHistory(id, limit?)` - Get execution history

These are **global** (not scoped by groupId) and configured via `VITE_XERRO_API_URL`.

**Messaging (xerro-service):**

The Agent Tasks section also includes a bidirectional messaging system between the user and agents:

- `messagesService.listThreads()` - List all message threads
- `messagesService.getThread(threadId)` - Get all messages in a thread
- `messagesService.sendMessage(input)` - Send a new message
- `messagesService.replyToMessage(id, body)` - Reply to a message
- `messagesService.markRead(id)` / `markAllRead()` - Mark messages as read
- `messagesService.deleteMessage(id)` - Delete a single message
- `messagesService.deleteThread(threadId)` - Delete an entire thread atomically (uses `DELETE /api/v1/messages/threads/:threadId`)

**Important:** Thread deletion uses a dedicated backend endpoint that deletes all messages in one atomic operation and emits a single `messages:thread-deleted` WebSocket event. Do not use the old client-side batch approach (fetching messages then deleting individually) — that causes intermediate state flickering via per-message SSE events.

## Design System

This project follows a comprehensive design system documented in `docs/design-system/`.

**Documentation Structure:**
- [Overview & Getting Started](docs/design-system/README.md) - Tech stack, prerequisites, quick start
- [Foundations](docs/design-system/foundations.md) - Typography, colors, spacing, radius
- [Layout](docs/design-system/layout.md) - Container component, page structure, responsive patterns
- [Components](docs/design-system/components.md) - Button, Card, Dialog, Form patterns with usage examples
- [Patterns](docs/design-system/patterns.md) - Tool buttons, delete confirmations, back buttons, icons
- [States](docs/design-system/states.md) - Loading, hover, focus, transitions, mutations
- [Data Presentation](docs/design-system/data-presentation.md) - Grids, lists, entity coloring, tables
- [Accessibility](docs/design-system/accessibility.md) - ARIA, focus management, semantic HTML

**Quick References:**
- Container component: See [Layout Guide](docs/design-system/layout.md#container-component)
- Tool buttons: See [Patterns Guide](docs/design-system/patterns.md#tool-button-hierarchy)
- Destructive confirmations: See [Patterns Guide](docs/design-system/patterns.md#destructive-confirmation-pattern)
- Color system: See [Foundations](docs/design-system/foundations.md#color-system)
- Responsive breakpoints: See [Layout Guide](docs/design-system/layout.md#responsive-patterns)

**Note:** For all UI/UX implementation questions, consult the design system documentation first. The design system is framework-agnostic and can be used to build similar applications.

## Design System Maintenance

**Important Rules:**

1. **Reference the Design System:** When implementing UI features, consult `docs/design-system/` first to follow established patterns.

2. **Update When Patterns Change:** If you modify or create new UI patterns, components, or styling conventions:
   - Update the relevant design system documentation
   - Document in the appropriate category (foundations.md, components.md, patterns.md, etc.)
   - Include code examples and usage guidelines

3. **Confirm Before Changes:** Always confirm with the user before:
   - Modifying existing design system documentation
   - Adding new patterns to the design system
   - Removing or deprecating documented patterns

4. **Keep in Sync:** The design system docs should always reflect the current state of the UI implementation. Don't let them drift out of sync.

**When to Update:**
- Creating new custom components (like ContainerToolButton)
- Establishing new visual patterns (like entity type coloring)
- Changing color schemes or spacing conventions
- Adding new page layout patterns
- Introducing new interaction patterns

**What to Document:**
- Component usage with clear examples
- Visual specifications (colors, spacing, sizing)
- Behavioral patterns (hover, focus, loading states)
- Responsive adaptations
- Accessibility considerations

### Application Structure

For UI/UX patterns and component usage, see [Design System Documentation](docs/design-system/).

```
src/
├── api/              # API service singletons
│   ├── graphitiService.ts    # Graphiti memory graph API
│   └── agentTasksService.ts  # xerro-service agent tasks API
├── components/       # Reusable UI components
│   ├── ui/          # ShadCN UI component library (complete)
│   ├── container/   # Container, ContainerTable, ContainerToolButton, ContainerToolToggle
│   ├── dialogs/     # DestructiveConfirmationDialog
│   ├── navigation/  # PrimaryNav, SecondaryNav, SecondaryNavItem, ProfileMenu, specific nav implementations
│   ├── sidebar/     # (empty)
│   ├── search/      # FactCard for search results
│   ├── entities/    # EntityCard for entity browsing
│   └── episodes/    # EpisodeCard for episode lists
├── context/         # GraphitiContext - global state (baseUrl, groupId)
├── hooks/           # Custom React hooks (debounce, scroll, toast, breakpoints)
├── layout/          # Router, Layout components
├── lib/             # Utilities (cn, lazyImportComponent, graphStorage, cronFormatter)
├── pages/           # Route pages (Dashboard, Search, Entities, AgentTasks, etc.)
└── types/           # TypeScript interfaces (graphiti, agentTasks, etc.)
```

### State Management

- **TanStack Query (React Query)** - Server state, caching, and data fetching
  - Configured with 5-minute stale time and 1 retry
  - Query keys follow pattern: `[resource, groupId, ...params]`
- **GraphitiContext** - Global configuration (baseUrl, groupId)
  - groupId stored in localStorage (`graphiti-selected-graph` key)
  - Automatically syncs across browser tabs via storage events
- **React Router** - Client-side routing with lazy-loaded pages
- **localStorage** - Persistent graph selection and chat history

### UI Components

Built with **ShadCN UI** (Radix UI + Tailwind CSS):

- Complete component library in `src/components/ui/`
- Theming via CSS variables and `next-themes`
- Responsive design with Tailwind breakpoints
- Form handling with `react-hook-form` + Zod validation

**For component usage patterns and styling guidelines**, see the [Design System Documentation](docs/design-system/).

### Navigation Components

**SecondaryNavItem** - Standardized navigation list item for secondary nav:

**Location:** `src/components/navigation/SecondaryNavItem.tsx`

**Purpose:** Provides consistent styling for all secondary navigation list items across the application.

**Styling Standards:**
- Padding: `py-3 px-3` (vertical: 12px, horizontal: 12px)
- Active state:
  - Light mode: `bg-accent` (full opacity)
  - Dark mode: `bg-accent/60` (60% opacity)
  - Text: `text-accent-foreground`
- Hover state: `bg-accent/50` (50% opacity)
- Border radius: `rounded-lg`
- Width: `w-full`
- Alignment: `justify-start`
- Height: `h-auto` (flexible based on content)

**Container Standards:**
- List container padding: `px-4` (horizontal: 16px)
- Container should use `flex-1 overflow-auto` for scrollable content
- Use `space-y-1` for consistent spacing between items

**Usage:**

```tsx
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";

<SecondaryNavItem
  isActive={selectedItem === item.id}
  onClick={() => handleSelect(item.id)}
>
  <div className="flex flex-col items-start w-full">
    <span className="font-medium truncate w-full text-left">
      {item.title}
    </span>
    <span className="text-xs text-muted-foreground">
      {item.subtitle}
    </span>
  </div>
</SecondaryNavItem>
```

**Used In:**
- `ProjectsSecondaryNav` - Project list navigation
- `DocumentsSecondaryNav` - Document/folder navigation
- `AgentTasksSecondaryNav` - Agent task list navigation
- `SecondaryNav` - Generic secondary navigation items

**Benefits:**
- Single source of truth for navigation item styling
- Consistent active/hover states across all navigation
- Easy to update styling globally
- Type-safe props with TypeScript

## Development Commands

**Prerequisites:**

- Copy `.env.example` to `.env` and configure environment variables

```bash
# Setup environment
cp .env.example .env
# Edit .env to set your group ID

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint TypeScript/React code
npm run lint

# Preview production build
npm run preview

# Type check
npx tsc -b
```

## Configuration

### Path Aliases

`@/*` maps to `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`)

### TypeScript

Uses TypeScript 5.9.3 with project references:

- `tsconfig.app.json` - Application code
- `tsconfig.node.json` - Build tooling (Vite, Tailwind)
- `tsconfig.json` - Root references

### Build Tool

**Vite 7** with `@vitejs/plugin-react-swc` for fast HMR and Fast Refresh

### Environment

**Server Configuration:**

All backend services are configured via environment variables:

- `VITE_XERRO_API_URL` - Xerro API base URL
- `VITE_LLAMACPP_URL` - LlamaCPP inference server (default: `http://localhost:9004`)
- `VITE_CHAT_API_URL` - Chat backend service (default: `http://localhost:3001`)

**Setup:**

1. Copy `.env.example` to `.env`
2. Set `VITE_XERRO_API_URL` to your xerro-service URL
3. Restart dev server after changing `.env` for changes to take effect
4. Access settings and theme toggle via the Profile Menu (avatar button at the bottom of the primary nav)

## Key Implementation Patterns

### Data Fetching

Use React Query hooks in page components:

```tsx
const { data: episodes, isLoading } = useQuery({
  queryKey: ["episodes", groupId, 10],
  queryFn: () => graphitiService.getEpisodes(groupId, 10),
});
```

### API Calls

Use the `graphitiService` singleton - it handles errors and displays toast notifications automatically:

```tsx
await graphitiService.addMessages(messages, groupId);
// Success toast shown automatically
```

### Routing

Pages are lazy-loaded via `lazyImportComponent` utility to minimize initial bundle size.

### Entity Management

**Entity Data Model:**

- Entities use a `labels` array for type classification (e.g., `["Person", "Entity"]`)
- Legacy `entity_type` field supported for backward compatibility
- Additional metadata stored in `attributes` object
- All entities scoped by `group_id` for multi-tenancy

**Entity Listing:**

- The Entities page uses the direct `listEntities()` endpoint
- Supports pagination via cursor-based navigation
- Filters by entity type using the `labels` array
- Search filters by name and summary fields

**Entity Types:**

- Extracted dynamically from entity `labels` array
- Generic "Entity" label filtered out from type dropdown
- Falls back to legacy `entity_type` if present

## Working with This Codebase

### Adding a New Page

1. Create component in `src/pages/[PageName].tsx`
2. Add route in `src/layout/Router.tsx` using `lazyImportComponent`
3. Add navigation link if needed (e.g., in Layout or Dashboard)

### Adding API Methods

1. Define TypeScript types in `src/types/graphiti.ts`
2. Add method to `GraphitiService` class in `src/api/graphitiService.ts`
3. Include error handling and toast notifications

### Modifying the Data Model

When Graphiti API changes:

1. Update interfaces in `src/types/graphiti.ts`
2. Update `GraphitiService` methods if needed
3. Update consuming components to handle new fields

### Working with Entity Endpoints

**Single Entity Retrieval:**

```tsx
const { data: entity } = useQuery({
  queryKey: ["entity", uuid],
  queryFn: () => graphitiService.getEntity(uuid),
});
```

**List Entities with Pagination:**

```tsx
const { data } = useQuery({
  queryKey: ["entities-list", groupId, limit],
  queryFn: () => graphitiService.listEntities(groupId, limit),
});
// Returns: { entities: Entity[], total: number, has_more: boolean, cursor: string | null }
```

**Batch Entity Retrieval:**

```tsx
const { data } = useQuery({
  queryKey: ["entities-batch", uuids],
  queryFn: () => graphitiService.getEntitiesByUuids(uuids),
});
```

### Styling

- Use existing ShadCN components from `src/components/ui/`
- Follow Tailwind utility-first approach
- Use `cn()` helper for conditional classes
- Icons from `lucide-react`

### Graph Management

The application supports multiple memory graphs (formerly group_ids):

- **Automatic Persistence** - Selected graph stored in localStorage (`graphiti-selected-graph` key)
- **Multi-Tab Sync** - Graph selection syncs across browser tabs via storage events

### Agent Tasks

The application includes a read-only "Agent Tasks" section for browsing scheduled tasks from xerro-service:

**Features:**

- **List Page** (`/agent-tasks`):
  - Search tasks by name (debounced)
  - Filter by enabled/disabled status
  - View task schedule (formatted cron expressions)
  - Click to view details

- **Detail Page** (`/agent-tasks/:id`):
  - Task configuration (schedule, properties, enabled status)
  - Execution history (last 20 runs with success/failure, duration, errors)
  - Visual indicators for task status

**API Integration:**

```tsx
// List all tasks
const { data } = useQuery({
  queryKey: ["agent-tasks", enabledFilter],
  queryFn: () => agentTasksService.listTasks(enabledFilter),
});

// Get task details
const { data: task } = useQuery({
  queryKey: ["agent-task", id],
  queryFn: () => agentTasksService.getTask(id),
});

// Get execution history
const { data: history } = useQuery({
  queryKey: ["agent-task-history", id],
  queryFn: () => agentTasksService.getTaskHistory(id, 20),
});
```

**Cron Formatting:**

The `formatCronExpression()` utility converts cron expressions to human-readable strings:
- `0 9 * * 1-5` → "Every weekday at 9:00 AM"
- `*/15 * * * *` → "Every 15 minutes"
- `0 9 * * *` → "Daily at 9:00 AM"

**Key Points:**

- Agent Tasks are **global** (not tied to graph selection)
- Read-only interface (no create/update/delete)
- Configured via `VITE_XERRO_API_URL` environment variable
- Automatic error handling with toast notifications

See `AGENT_TASKS_IMPLEMENTATION.md` for detailed implementation notes.

## Important Notes

- the inspiration for this web site design, UI, UX, architecture and components comes from this project: /Users/dweaver/Projects/davideweaver/section-shaper-single-page. when implementing new features, pages, etc look at that project.
- **Entity data model**:
  - Entity types stored in `labels` array (e.g., `["Person", "Entity"]`)
  - Legacy `entity_type` field maintained for backward compatibility
  - Additional metadata in `attributes` object
- **Entity pagination**: Use cursor-based pagination for large entity lists (limit: 1-500 entities per request)
- Entity edges (relationships) have `valid_at` and `invalid_at` timestamps for temporal reasoning
- **Graph Management**: All data operations are scoped to the currently selected graph (multi-tenant design)
  - The current graph selection persists in localStorage across sessions
- Search results are limited by `max_facts` parameter (default: 10)
