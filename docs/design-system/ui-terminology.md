# UI Terminology

Naming conventions for UI areas, components, state variables, and files. This guide focuses on **what to call things**, not how to implement them.

## UI Area Names

### Layout Regions

**Desktop Layout (3-column structure):**

```
┌─────┬──────────────┬────────────────────────┐
│ Pri │  Secondary   │         Page           │
│ Nav │     Nav      │                        │
│     │              │                        │
│ 75  │     380      │        flex-1          │
└─────┴──────────────┴────────────────────────┘
```

**Mobile Layout (closed):**

```
┌────────────────────────────┐
│  [☰]  Page Title           │
├────────────────────────────┤
│                            │
│         Page               │
│      (full width)          │
│                            │
└────────────────────────────┘
```

**Mobile Nav (open):**

```
┌──────────────┬─────────────┐
│ [✕]          │ Secondary   │
│ Primary Nav  │    Nav      │
│              │             │
│ [Section 1]  │ Section     │
│ [Section 2]  │ content     │
│ [Section 3]  │ with        │
│ [Section 4]  │ filters &   │
│ [Section 5]  │ items       │
│              │             │
│ [User Menu]  │             │
└──────────────┴─────────────┘
     (Drawer combining both navs)
```

**Section** — A top-level grouping of app functionality, represented by a single icon in the Primary Nav. Selecting a section activates it and switches the Secondary Nav to show section-specific navigation. Referred to as "[Name] section" (e.g., "Home section", "Boards section", "Settings section").

**Primary Nav** - The 75px left sidebar with icon-only navigation. Each icon represents one Section.
- Component: `PrimaryNav`
- See [Layout](layout.md#navigation) for implementation details

**Secondary Nav** - The 380px middle column with contextual navigation. Content changes based on the active Section.
- Components: `SecondaryNav`, `[Section]SecondaryNav` (section-specific variants)
- See [Layout](layout.md#navigation) for implementation details

**Page** - The primary content region on the right
- Uses the `Container` component pattern
- See [Layout](layout.md#container-component) for implementation details

**Mobile Nav** - Combined navigation for mobile devices
- Components: `MobileNavTrigger` (hamburger button), `DraggableMobileNav` (drawer with swipe-to-close)
- See [Layout](layout.md#responsive-patterns) for mobile patterns

## Component Naming Patterns

### Containers

- `Container` - Base page wrapper
- `ContainerTable` - Table layout wrapper
- `ContainerToolButton` - Toolbar action button

See [Components](components.md#container) for usage examples.

### Navigation

- `PrimaryNav` - Main left sidebar
- `ProfileMenu` - Profile avatar button in primary nav footer; opens popover with Settings and theme toggle
- `SecondaryNav` - Middle column base component
- `[Section]SecondaryNav` - Section-specific navigation (e.g., `BoardsSecondaryNav`, `SettingsSecondaryNav`)
- `MobileNavTrigger` - Mobile menu button
- `DraggableMobileNav` - Mobile navigation drawer with swipe-to-close and drag-to-open-from-edge

### Dialogs

- `DestructiveConfirmationDialog` - Reusable confirmation for destructive actions (delete, cancel, clear, etc.)

See [Patterns](patterns.md#destructive-confirmation-pattern) for dialog patterns.

### Profile Menu

The **ProfileMenu** component lives in the primary nav footer and provides access to app settings and theme toggle.

**Location:** `src/components/navigation/ProfileMenu.tsx`

**Trigger:** Avatar button (`h-12 w-12` ghost button with `Avatar` fallback initials)

**Popover:**
- Width: `w-52`, aligned `start`, side `top`, offset `10`
- Menu items:
  - **Settings** — navigates to the app's settings section
  - **Toggle Dark Mode** — switches light/dark via `next-themes`

**Props:**
- `onAfterClick?: () => void` — called after any menu action (used to close the mobile nav)

**Usage:**
```tsx
<PrimaryNav
  navigationConfig={...}
  footer={<ProfileMenu onAfterClick={() => setMobileNavOpen(false)} />}
/>
```

## State Naming Conventions

### Boolean States

Use `is[State]` pattern:

```tsx
const [isLoading, setIsLoading] = useState(false);
const [isOpen, setIsOpen] = useState(false);
const [isExpanded, setIsExpanded] = useState(true);
const [isEnabled, setIsEnabled] = useState(true);
const [isDeleting, setIsDeleting] = useState(false);
```

### Event Handlers

**Internal handlers:** Use `handle[Action]` pattern:
```tsx
const handleDelete = () => { /* ... */ };
const handleSubmit = () => { /* ... */ };
```

**Props/callbacks:** Use `on[Action]` pattern:
```tsx
<Component
  onDelete={handleDelete}
  onSubmit={handleSubmit}
/>
```

See [Patterns](patterns.md) for interaction patterns.

### Query Keys

Array format: `[resource, scope, ...params]`

```tsx
["items", id]                         // Single item
["items-list", scopeId, limit]        // Item list
["search", scopeId, query]            // Search results
```

## File Naming Conventions

### Components

**PascalCase** matching component name:
```
Container.tsx
PrimaryNav.tsx
BoardsSecondaryNav.tsx
```

### Utilities and Services

**camelCase** describing function/purpose:
```
apiService.ts
cronFormatter.ts
```

### Types

**camelCase** describing domain:
```
navigation.ts
boards.ts
```

### Directories

**lowercase** with hyphens (if multi-word):
```
src/components/
src/components/ui/
src/components/navigation/
src/components/container/
src/components/mobile/
src/components/shared/
```

## Folder Organization

```
src/components/
├── ui/              # ShadCN UI library
├── container/       # Container components (Container, ContainerToolButton, ContainerToolToggle)
├── navigation/      # Navigation components (PrimaryNav, SecondaryNav, ProfileMenu, etc.)
├── dialogs/         # Dialog components
├── mobile/          # Mobile-specific components (MobileOverflowMenu, MobileBottomDrawer)
└── shared/          # Shared utility components (SidePanelHeader, etc.)
```

See [Components](components.md) for detailed component documentation.

## Quick Reference

| Concept | Name | Example |
|---------|------|---------|
| Top-level nav unit | Section | "Boards section", "Settings section" |
| Left sidebar | Primary Nav | `PrimaryNav` |
| Middle column | Secondary Nav | `SecondaryNav`, `BoardsSecondaryNav` |
| Right content | Page | `Container` |
| Mobile menu | Mobile Nav | `MobileNavTrigger`, `DraggableMobileNav` |
| Profile menu | ProfileMenu | `<ProfileMenu onAfterClick={...} />` |
| Page wrapper | Container | `<Container title="...">` |
| Toolbar button | ContainerToolButton | `<ContainerToolButton>` |
| Toolbar toggle | ContainerToolToggle | `<ContainerToolToggle pressed={...}>` |
| Secondary nav button | SecondaryNavToolButton | `<SecondaryNavToolButton>` |
| Side panel header | SidePanelHeader | `<SidePanelHeader title="...">` |
| Boolean state | is[State] | `isLoading`, `isOpen` |
| Event handler | handle[Action] | `handleSubmit` |
| Callback prop | on[Action] | `onSubmit` |
| Component file | PascalCase | `BoardsSecondaryNav.tsx` |
| Utility file | camelCase | `cronFormatter.ts` |

## See Also

- [Layout](layout.md) - Implementation details for UI regions
- [Components](components.md) - Component usage and props
- [Patterns](patterns.md) - Common UI patterns and interactions
- [Foundations](foundations.md) - Colors, spacing, typography
