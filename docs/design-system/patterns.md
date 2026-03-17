# Patterns

Common UI patterns, conventions, and reusable solutions for frequent design challenges.

## Tool Button Hierarchy

All tool buttons in Container toolbars should use `ContainerToolButton` with `size="sm"` for consistent height. Icons should use `className="h-4 w-4 mr-2"`.

### Button Positioning and Variants

**1. Action buttons** (left and middle positions) - `default` variant

- Back, Info, Edit, etc.
- All non-destructive actions use default variant (no variant prop needed)
- Visual hierarchy determined by position (left-most = primary action)
- Get subtle neutral gray background for visual grouping

**2. Destructive actions** (right-most position) - `variant="destructive"`

- Delete, Remove, Clear, etc.
- Always positioned last (right-most)
- Gets red styling on hover for danger indication

### Example Toolbar

```tsx
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ChevronLeft, Info, Trash2 } from "lucide-react";

const tools = (
  <div className="flex gap-2">
    {/* Primary action: Back button (left-most) */}
    <ContainerToolButton size="sm" onClick={() => navigate(-1)}>
      <ChevronLeft className="h-4 w-4 md:mr-2" />
      <span className="hidden md:inline">Back</span>
    </ContainerToolButton>

    {/* Other actions: Info */}
    <ContainerToolButton size="sm" onClick={() => setSheetOpen(true)}>
      <Info className="h-4 w-4 mr-2" />
      Info
    </ContainerToolButton>

    {/* Destructive action: Delete (right-most) */}
    <ContainerToolButton variant="destructive" size="sm" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </ContainerToolButton>
  </div>
);
```

## Toggle Buttons (ContainerToolToggle)

Use `ContainerToolToggle` for binary on/off states in Container toolbars. It uses Radix's Toggle primitive with `pressed` / `onPressedChange` props.

### Icon Intensity Pattern

Icons inside toggles must visually communicate active vs inactive state using both `strokeWidth` and `opacity`:

- **Active (pressed):** `strokeWidth={2.5}`, full opacity
- **Inactive (unpressed):** `strokeWidth={1.5}`, `className="opacity-40"`

```tsx
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { List } from "lucide-react";

<ContainerToolToggle
  pressed={isListView}
  onPressedChange={(on) => setIsListView(on)}
  title={isListView ? "Switch to day view" : "Switch to list view"}
>
  <List
    strokeWidth={isListView ? 2.5 : 1.5}
    className={isListView ? undefined : "opacity-40"}
  />
</ContainerToolToggle>
```

For colored icons (e.g. favorites star), combine `fill` and `className` for color changes too:

```tsx
<Star
  strokeWidth={isActive ? 2.5 : 1.5}
  fill={isActive ? "currentColor" : "none"}
  className={isActive ? "text-amber-400" : "opacity-40"}
/>
```

**Used in:** `Notifications.tsx`, `FeedsTopic.tsx`, `Calendar.tsx`

## Secondary Navigation Tool Buttons

Secondary navigation sidebars use **SecondaryNavToolButton** for header toolbar actions. These are icon-only buttons with a more compact design compared to page Container tool buttons.

### Component Code

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const secondaryNavToolButtonVariants = cva(
  // Base classes with fixed h-10 w-10 sizing
  "inline-flex items-center justify-center h-10 w-10 rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "ghost",
    },
  },
);

export interface SecondaryNavToolButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof secondaryNavToolButtonVariants> {}

export const SecondaryNavToolButton = React.forwardRef<
  HTMLButtonElement,
  SecondaryNavToolButtonProps
>(({ className, variant, ...props }, ref) => {
  return (
    <button
      className={cn(secondaryNavToolButtonVariants({ variant, className }))}
      ref={ref}
      {...props}
    />
  );
});

SecondaryNavToolButton.displayName = "SecondaryNavToolButton";
```

### Design Specifications

| Property | Value | Notes |
|----------|-------|-------|
| **Button Size** | h-10 w-10 (40x40px) | Fixed square size |
| **Variant** | ghost | Only variant available |
| **Icon Control** | Via icon's size prop | No CSS override - icons control their own size |
| **Gap** | gap-1 (4px) | Set by SecondaryNavContainer, not button |
| **Border Radius** | rounded-md | Consistent with other buttons |

### Icon Sizing

**Important:** Icons control their own size using the `size` prop. The button does not enforce a default icon size via CSS.

```tsx
// Smaller icon (18px)
<SecondaryNavToolButton onClick={handleRefresh}>
  <RefreshCw size={18} />
</SecondaryNavToolButton>

// Standard icon (20px)
<SecondaryNavToolButton onClick={handleSearch}>
  <Search size={20} />
</SecondaryNavToolButton>

// Larger icon (24px)
<SecondaryNavToolButton onClick={handleAdd}>
  <Plus size={24} />
</SecondaryNavToolButton>
```

### Comparison with ContainerToolButton

| Feature | ContainerToolButton | SecondaryNavToolButton |
|---------|---------------------|------------------------|
| **Use Case** | Page toolbar actions | Secondary nav toolbar actions |
| **Button Size** | h-9 (36px) | h-10 (40px) |
| **Sizes Available** | sm, icon | None (always fixed) |
| **Variants** | default, primary, destructive, outline, ghost | ghost only |
| **Text Support** | Yes (with icon or alone) | No (icon-only) |
| **Icon Size** | size-4 (16px) via CSS | Controlled by icon's size prop |

### Usage Example

```tsx
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { RefreshCw, Search, Plus } from "lucide-react";

export function MySecondaryNav() {
  return (
    <SecondaryNavContainer
      title="Documents"
      tools={
        <>
          <SecondaryNavToolButton onClick={handleRefresh}>
            <RefreshCw size={18} />
          </SecondaryNavToolButton>
          <SecondaryNavToolButton onClick={handleSearch}>
            <Search size={20} />
          </SecondaryNavToolButton>
          <SecondaryNavToolButton onClick={handleAdd}>
            <Plus size={22} />
          </SecondaryNavToolButton>
        </>
      }
    >
      {/* Navigation content */}
    </SecondaryNavContainer>
  );
}
```

### Best Practices

1. **Icon-Only Design** - Never add text to these buttons. Use tooltips if labels are needed.
2. **Icon Size Range** - Keep icons between 16px-24px for balance with 40px button size.
3. **Common Actions** - Typical actions include refresh, search, add, filter, settings.
4. **Compact Spacing** - SecondaryNavContainer uses gap-1 (4px) between buttons.
5. **Visual Balance** - Similar-sized icons (within 2-4px of each other) look best together.

### Common Icon Sizes

- **18px** - Compact icons (RefreshCw, X, Filter)
- **20px** - Standard icons (Search, Settings, Bell)
- **22px** - Prominent icons (Plus, Download, Upload)
- **24px** - Large icons (rare, use sparingly)

## Back Button Pattern

The back button should always be the **first tool** (left-most position) in the toolbar.

### Guidelines

- **Position:** First tool (left-most button)
- **Variant:** Default (no variant prop needed) - makes it the primary action
- **Icon:** `<ChevronLeft className="h-4 w-4 md:mr-2" />` (single chevron, not arrow)
- **Text:** "Back" (or context-specific like "Back to Search")
- **Mobile behavior:** Show only the chevron icon, hide text

### Implementation

```tsx
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DetailPage() {
  const navigate = useNavigate();

  const tools = (
    <div className="flex gap-2">
      <ContainerToolButton size="sm" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Back</span>
      </ContainerToolButton>
      {/* Other tools */}
    </div>
  );

  return <Container title="Details" tools={tools}>{/* content */}</Container>;
}
```

### Mobile Responsive Behavior

```tsx
// Icon margin only on desktop (removed on mobile)
<ChevronLeft className="h-4 w-4 md:mr-2" />

// Text hidden on mobile, shown on desktop
<span className="hidden md:inline">Back</span>
```

Result:
- Mobile: Shows only chevron icon (no text, no margin)
- Desktop: Shows "< Back" with proper spacing

### Context-Specific Labels

```tsx
// Generic back
<span className="hidden md:inline">Back</span>

// Back to specific page
<span className="hidden md:inline">Back to Search</span>
<span className="hidden md:inline">Back to Entities</span>
```

## Destructive Confirmation Pattern

All destructive operations (delete, cancel, clear, etc.) should use the `DestructiveConfirmationDialog` component for consistency and better UX.

### Component Props

The component accepts these props:
- `open` - Boolean controlling dialog visibility
- `onOpenChange` - Callback when dialog open state changes
- `onConfirm` - Called when user confirms the action
- `onCancel` - Called when user cancels
- `title` - Dialog title (e.g., "Delete Item", "Cancel Task")
- `description` - Detailed description of what will happen
- `isLoading` - Optional: Shows loading state (default: false)
- `confirmText` - Optional: Confirm button text (default: "Delete")
- `confirmLoadingText` - Optional: Loading text (default: "Deleting...")
- `confirmVariant` - Optional: Button variant (default: "destructive")

### Full Usage Pattern (Delete)

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Trash2 } from "lucide-react";

function MyComponent() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemType | null>(null);

  // Mutation for deleting the item
  const deleteMutation = useMutation({
    mutationFn: () => myService.deleteItem(itemToDelete!.id),
    onError: () => {
      // Close dialog on error (error toast shown by service)
      setDeleteDialogOpen(false);
    },
    onSuccess: () => {
      // Close dialog immediately
      setDeleteDialogOpen(false);
      setItemToDelete(null);

      // Cleanup and navigation
      queryClient.invalidateQueries({ queryKey: ["items"] });
      navigate("/items"); // Or wherever appropriate
    },
  });

  // Handler to open the delete dialog
  const handleOpenDeleteDialog = (item: ItemType) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Handler to confirm delete (called by dialog)
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate();
    }
  };

  // Handler to cancel delete (called by dialog)
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <>
      {/* Delete button in toolbar */}
      <ContainerToolButton
        variant="destructive"
        size="sm"
        onClick={() => handleOpenDeleteDialog(item)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </ContainerToolButton>

      {/* Delete confirmation dialog */}
      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Item"
        description={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
```

### Key Points

**State Management:**
- Store both the dialog state and the item/context for the action
- When user triggers action, set the context and open the dialog
- On confirm: execute the mutation and clean up state on success
- On cancel: just close the dialog and reset state

**Loading State:**
- Pass `isLoading={mutation.isPending}` to the dialog
- Button shows spinner and loading text while pending
- Both buttons are disabled during operation to prevent multiple clicks
- Dialog closes automatically on success or error

**Description Format:**
- Always include "This action cannot be undone." for irreversible operations
- Include the item/context name for clarity
- Use template literals for dynamic descriptions

**Mutation Handling:**
- Use React Query's `useMutation` for operations
- Handle both `onError` and `onSuccess` to close dialog
- Invalidate relevant queries on success
- Navigate away from deleted item's detail page if needed

### Examples in Codebase

**Delete Entity:**
```tsx
<DestructiveConfirmationDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  title="Delete Entity"
  description={`Are you sure you want to delete "${entity?.name}"? This will remove the entity and all its relationships. This action cannot be undone.`}
  isLoading={deleteMutation.isPending}
/>
```

**Cancel Task Execution:**
```tsx
<DestructiveConfirmationDialog
  open={cancelDialogOpen}
  onOpenChange={setCancelDialogOpen}
  onConfirm={handleConfirmCancel}
  onCancel={() => setCancelDialogOpen(false)}
  title="Cancel Task Execution"
  description={`Are you sure you want to cancel "${taskName}"? This action cannot be undone.`}
  isLoading={cancelMutation.isPending}
  confirmText="Cancel Task"
  confirmLoadingText="Cancelling..."
  confirmVariant="destructive"
/>
```

**Clear Scratchpad:**
```tsx
<DestructiveConfirmationDialog
  open={clearDialogOpen}
  onOpenChange={setClearDialogOpen}
  onConfirm={handleConfirmClear}
  onCancel={() => setClearDialogOpen(false)}
  title="Clear Scratchpad"
  description="Are you sure you want to clear the scratchpad? This action cannot be undone and all scratchpad data will be permanently deleted."
  isLoading={clearMutation.isPending}
  confirmText="Clear"
  confirmLoadingText="Clearing..."
/>
```

## Empty States

Show helpful messages when there's no data to display.

### Basic Empty State

```tsx
<Card>
  <CardContent className="p-6 text-center text-muted-foreground">
    <p>No items found.</p>
  </CardContent>
</Card>
```

### Empty State with Icon

```tsx
import { FileX } from "lucide-react";

<Card>
  <CardContent className="p-12 text-center">
    <FileX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
    <p className="text-lg font-semibold mb-2">No items found</p>
    <p className="text-sm text-muted-foreground">
      Try adjusting your filters or create a new item.
    </p>
  </CardContent>
</Card>
```

### Empty State with Action

```tsx
<Card>
  <CardContent className="p-12 text-center">
    <FileX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
    <p className="text-lg font-semibold mb-2">No items yet</p>
    <p className="text-sm text-muted-foreground mb-4">
      Get started by creating your first item.
    </p>
    <Button onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      Create Item
    </Button>
  </CardContent>
</Card>
```

## Error States

Display errors with clear messages and recovery options.

### Basic Error State

```tsx
<Card>
  <CardContent className="p-6 text-center text-destructive">
    <p>Error loading data. Please try again.</p>
  </CardContent>
</Card>
```

### Error State with Retry

```tsx
import { AlertCircle, RefreshCw } from "lucide-react";

<Card>
  <CardContent className="p-12 text-center">
    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
    <p className="text-lg font-semibold mb-2">Error Loading Data</p>
    <p className="text-sm text-muted-foreground mb-4">
      {error?.message || "Something went wrong. Please try again."}
    </p>
    <Button onClick={refetch}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </CardContent>
</Card>
```

## Icon Usage Conventions

### Icon Sizing

**Standard sizes:**
- Small: `h-4 w-4` (16px) - Used in buttons, badges
- Medium: `h-5 w-5` (20px) - Used in card headers
- Large: `h-6 w-6` (24px) - Used in page headers, empty states
- Extra large: `h-12 w-12` (48px) - Used in empty/error states

### Icon Spacing

**With text:**
```tsx
// Before text (mr-2 = 8px margin right)
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add New
</Button>

// After text (ml-2 = 8px margin left)
<Button>
  Continue
  <ChevronRight className="h-4 w-4 ml-2" />
</Button>
```

**Mobile responsive:**
```tsx
// Margin only on desktop
<ChevronLeft className="h-4 w-4 md:mr-2" />
<span className="hidden md:inline">Back</span>
```

### Common Icons

From `lucide-react`:

**Actions:**
- `Plus` - Add/create actions
- `Edit` - Edit actions
- `Trash2` - Delete actions
- `Save` - Save actions
- `X` - Close/cancel actions

**Navigation:**
- `ChevronLeft` - Back buttons
- `ChevronRight` - Forward/next actions
- `ChevronDown` - Dropdown indicators, collapsibles
- `ArrowLeft` - Previous in pagination
- `ArrowRight` - Next in pagination

**Status:**
- `Loader2` - Loading spinners (with `animate-spin`)
- `AlertCircle` - Warnings/errors
- `CheckCircle` - Success states
- `Info` - Information

**Data:**
- `Search` - Search inputs
- `Filter` - Filter actions
- `FileX` - Empty states
- `Calendar` - Date pickers

### Icon-Only Buttons

```tsx
<Button size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

Use `size="icon"` for square buttons with no text.

### Large Icons in Fixed-Size Buttons

When you need a larger icon while keeping the button size fixed, use the `[&_svg]:!size-*` pattern to target SVG children directly:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-11 w-11 p-0 [&_svg]:!size-6"
>
  <Search />
</Button>
```

**Pattern breakdown:**
- `h-11 w-11` - Explicit button size (44px × 44px)
- `p-0` - Remove padding to maximize icon space
- `[&_svg]:!size-6` - Target SVG children directly, set size to 6 (24px)
- `!` - Important flag to override default icon sizes
- No className on icon component - styling applied via button's SVG selector

**Common size combinations:**
- Button `h-11 w-11` + Icon `[&_svg]:!size-6` (24px icon in 44px button)
- Button `h-14 w-14` + Icon `[&_svg]:!size-7` (28px icon in 56px button)
- Button `h-16 w-16` + Icon `[&_svg]:!size-8` (32px icon in 64px button)

**When to use:**
- Navigation headers with prominent icon buttons
- Action buttons that need visual emphasis
- Touch targets that need larger icons for accessibility

**Used in:**
- `PrimaryNav` - Main navigation icon buttons (`h-14 w-14` with `[&_svg]:!size-5`)
- `DocumentsSecondaryNav` - Search button header (`h-11 w-11` with `[&_svg]:!size-6`)

## Text Truncation

### Single Line Truncation

```tsx
<h3 className="truncate">
  {veryLongTitle}
</h3>
```

### Multi-Line Truncation (Line Clamp)

```tsx
// 2 lines
<p className="text-sm text-muted-foreground line-clamp-2">
  {longDescription}
</p>

// 3 lines
<p className="line-clamp-3">
  {evenLongerContent}
</p>
```

### Truncation with Flex Layout

```tsx
<div className="flex items-start gap-4">
  <div className="flex-shrink-0">
    {/* Fixed width element (avatar, icon, etc.) */}
  </div>
  <div className="flex-1 min-w-0">
    {/* Truncatable content */}
    <h3 className="truncate">{title}</h3>
    <p className="line-clamp-2">{description}</p>
  </div>
</div>
```

The `min-w-0` on the flex-1 container is critical for truncation to work properly.

## Hover Visibility Pattern

Show actions only when hovering over an element.

### Group Hover for Inline Actions

Hover-reveal actions must always be visible on mobile — there is no hover state on touch devices.

```tsx
const isMobile = useIsMobile();

<div className="group relative">
  {/* Main content */}
  <div className="flex items-center justify-between">
    <span>{item.name}</span>

    {/* Actions: always visible on mobile, reveal on hover on desktop */}
    <div className={isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}>
      <Button size="icon" variant="ghost">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
</div>
```

**Rule:** Any action hidden behind `opacity-0 group-hover:opacity-100` must use `useIsMobile()` and render at full opacity on mobile. Without this, touch users have no way to access the action.

### Card with Hover Actions

```tsx
<Card className="group cursor-pointer hover:shadow-md transition-shadow">
  <CardContent className="p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Action button appears on card hover */}
      <Button
        size="icon"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleAction}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  </CardContent>
</Card>
```

## Form Field Layouts

### Standard Field Layout

```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Label</Label>
  <Input id="field" type="text" />
</div>
```

**Pattern:**
- Container: `space-y-2` (8px between label and input)
- Label uses `htmlFor` to match input `id`

### Multiple Fields Layout

```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="field1">Field 1</Label>
    <Input id="field1" />
  </div>

  <div className="space-y-2">
    <Label htmlFor="field2">Field 2</Label>
    <Input id="field2" />
  </div>
</div>
```

**Pattern:**
- Outer container: `space-y-4` (16px between fields)
- Each field: `space-y-2` (8px between label and input)

### Optional Field Indicator

```tsx
<Label htmlFor="field">
  Field Label
  <span className="text-muted-foreground ml-1">(optional)</span>
</Label>
```

### Field with Helper Text

```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Label</Label>
  <Input id="field" type="text" />
  <p className="text-xs text-muted-foreground">
    Helper text explaining the field requirements.
  </p>
</div>
```

### Field with Error

```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Label</Label>
  <Input
    id="field"
    type="text"
    className={error ? "border-destructive" : ""}
  />
  {error && (
    <p className="text-xs text-destructive">
      {error.message}
    </p>
  )}
</div>
```

## Loading Patterns

See [states.md](./states.md#loading-states) for comprehensive loading state patterns.

### Inline Loading

```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  {isLoading ? "Loading..." : "Submit"}
</Button>
```

### Page Loading

```tsx
<Container title="Page Title" loading={isLoading}>
  {/* Content only shows when loading=false */}
</Container>
```

## Search Pattern

### Debounced Search Input

```tsx
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
```

### Search with Clear Button

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    type="text"
    placeholder="Search..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="pl-10 pr-10"
  />
  {query && (
    <button
      onClick={() => setQuery("")}
      className="absolute right-3 top-1/2 transform -translate-y-1/2"
    >
      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
    </button>
  )}
</div>
```

## Filter Pattern

### Filter with Select

```tsx
<div className="flex gap-4 items-center">
  <Label>Filter:</Label>
  <Select value={filter} onValueChange={setFilter}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="All items" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Items</SelectItem>
      <SelectItem value="active">Active Only</SelectItem>
      <SelectItem value="inactive">Inactive Only</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Multiple Filters

```tsx
<div className="flex flex-wrap gap-4">
  <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Types</SelectItem>
      <SelectItem value="person">Person</SelectItem>
      <SelectItem value="org">Organization</SelectItem>
    </SelectContent>
  </Select>

  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Status</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectContent>
  </Select>
</div>
```

## Pagination Pattern

### Basic Pagination

```tsx
<div className="flex justify-between items-center mt-6">
  <Button
    variant="outline"
    onClick={handlePrevious}
    disabled={!hasPrevious}
  >
    <ArrowLeft className="h-4 w-4 mr-2" />
    Previous
  </Button>

  <span className="text-sm text-muted-foreground">
    Page {currentPage} of {totalPages}
  </span>

  <Button
    variant="outline"
    onClick={handleNext}
    disabled={!hasNext}
  >
    Next
    <ArrowRight className="h-4 w-4 ml-2" />
  </Button>
</div>
```

### Cursor-Based Pagination

```tsx
<div className="flex justify-between items-center mt-6">
  <Button
    variant="outline"
    onClick={() => loadMore(previousCursor)}
    disabled={!previousCursor}
  >
    <ArrowLeft className="h-4 w-4 mr-2" />
    Previous
  </Button>

  <Button
    variant="outline"
    onClick={() => loadMore(nextCursor)}
    disabled={!nextCursor}
  >
    Next
    <ArrowRight className="h-4 w-4 ml-2" />
  </Button>
</div>
```

## Notification Badges

Notification badges display unread counts on navigation items using the `NotificationBadge` component and `useUnreadNotificationCount` hook.

### Badge Component

The `NotificationBadge` component displays a count with automatic formatting:
- Shows count up to 99
- Displays "99+" for counts over 99
- Automatically hides when count is 0
- Two sizes: `sm` (16px) and `md` (20px) - `sm` used for both nav types

```tsx
import { NotificationBadge } from "@/components/notifications/NotificationBadge";

// Primary nav
<NotificationBadge count={unreadCount} size="sm" />

// Secondary nav
<NotificationBadge count={unreadCount} size="sm" className="ml-auto" />
```

### Unread Count Hook

The `useUnreadNotificationCount` hook provides real-time unread count tracking:
- Fetches initial count from API
- Updates automatically via WebSocket events
- Refetches every 60 seconds as backup

```tsx
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

function MyComponent() {
  const { unreadCount, isLoading, error } = useUnreadNotificationCount();

  return (
    <div>
      {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
    </div>
  );
}
```

### Primary Navigation Badge

Add badges to primary nav items via the `indicators` prop:

```tsx
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

function Layout() {
  const { unreadCount } = useUnreadNotificationCount();

  const navIndicators = {
    "home": unreadCount > 0 ? (
      <NotificationBadge count={unreadCount} size="sm" />
    ) : null,
  };

  return (
    <PrimaryNav
      navigationConfig={navigationConfig}
      activePrimary={activePrimary}
      onNavigate={handleNavigate}
      indicators={navIndicators}
    />
  );
}
```

**Position:** Top-right corner of nav button (via `absolute top-1 right-1`)

### Secondary Navigation Badge

Add badges inline with nav items using `ml-auto` for right alignment:

```tsx
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

function SecondaryNav() {
  const { unreadCount } = useUnreadNotificationCount();

  return (
    <SecondaryNavItem
      isActive={isActive}
      onClick={() => navigate("/notifications")}
      className="gap-3 h-11"
    >
      <Bell className="h-5 w-5" />
      <span>Notifications</span>
      {unreadCount > 0 && (
        <NotificationBadge count={unreadCount} size="sm" className="ml-auto" />
      )}
    </SecondaryNavItem>
  );
}
```

**Position:** Far right of nav item (via `ml-auto`)

### Design Specifications

| Property | sm | md |
|----------|----|----|
| **Height** | h-4 (16px) | h-5 (20px) |
| **Width** | w-4 (16px) | w-5 (20px) |
| **Min Width** | min-w-[16px] | min-w-[20px] |
| **Text Size** | text-[10px] | text-xs |
| **Padding (99+)** | px-1 | px-1.5 |
| **Background** | bg-blue-500 | bg-blue-500 |
| **Text Color** | text-white | text-white |
| **Border Radius** | rounded-full | rounded-full |

### Real-Time Updates

The badge automatically updates when:
- **New notification created** - Count increments via WebSocket `notification:created` event
- **Notification marked as read** - Count decrements via WebSocket `notification:read` event
- **All marked as read** - Count resets to 0 via WebSocket `notifications:read-all` event
- **API refetch** - Periodic backup every 60 seconds

No manual cache invalidation needed - updates are handled by the hook.

### Priority Ordering

When multiple indicators compete for the same nav item (e.g., home section):
1. **Notification badge** - Shows when unreadCount > 0 (highest priority)
2. **Disconnection indicator** - Shows when WebSocket disconnected (lower priority)
3. **Other indicators** - App-specific indicators

```tsx
const navIndicators = {
  "home": unreadCount > 0 ? (
    <NotificationBadge count={unreadCount} size="sm" />
  ) : !xerroIsConnected ? (
    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500">
      <WifiOff className="w-2.5 h-2.5 text-white" />
    </div>
  ) : null,
};
```

## Mobile Overflow Menu Pattern

Use the `MobileOverflowMenu` wrapper for toolbar tools that should overflow to a drawer on mobile. This pattern automatically handles responsive behavior and uses a non-portaled drawer to preserve "trusted user gesture" context for secure browser APIs (clipboard, geolocation, etc.).

### Why Non-Portaled?

**Problem:** Radix UI components (Sheet, Dialog, DropdownMenu) use React Portal to render content at the document root. Mobile browsers block secure APIs like `navigator.clipboard` when called from portaled content because the portal breaks the "trusted user gesture" chain.

**Solution:** `MobileOverflowMenu` uses `MobileBottomDrawer` which renders inline in the component tree with `fixed` positioning, maintaining the user gesture context while providing the same visual experience as a Sheet.

### MobileOverflowMenu Component

**Location:** `src/components/mobile/MobileOverflowMenu.tsx`

The `MobileOverflowMenu` wrapper automatically handles responsive behavior for overflow tools:

**Desktop:** Renders children inline (standard behavior)
**Mobile:** Hides children and shows a three-dot (⋮) button that opens a non-portaled bottom drawer

```tsx
interface MobileOverflowMenuProps {
  title: string;        // Drawer title on mobile
  children: ReactNode;  // Tools to overflow
  disabled?: boolean;   // Disable overflow button
}
```

### Usage Pattern

Wrap overflow tools with `MobileOverflowMenu`. The wrapper handles all responsive logic automatically.

```tsx
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { MobileOverflowMenu } from "@/components/mobile/MobileOverflowMenu";
import { MobileDrawerButton } from "@/components/mobile/MobileBottomDrawer";
import { RefreshCw, Copy, Trash2 } from "lucide-react";

<div className="flex gap-2">
  {/* Always visible tools */}
  <ContainerToolButton size="icon" onClick={handleEdit}>
    <Edit className="h-4 w-4" />
  </ContainerToolButton>

  {/* Overflow tools */}
  <MobileOverflowMenu title="More Options" disabled={!documentData}>
    {/* Tool button with label for mobile drawer */}
    <ContainerToolButton
      size="icon"
      onClick={handleRefresh}
      data-drawer-label="Refresh"
    >
      <RefreshCw className="h-4 w-4" />
    </ContainerToolButton>

    {/* Desktop: Dropdown menu (shown inline) */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ContainerToolButton size="sm">
          <Copy className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 ml-1" />
        </ContainerToolButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>Copy</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Mobile: Flattened drawer items */}
    <MobileDrawerButton onClick={handleCopy} icon={<Copy />}>
      Copy content
    </MobileDrawerButton>

    {/* Destructive tool button */}
    <ContainerToolButton
      size="icon"
      onClick={handleDelete}
      variant="destructive"
      data-drawer-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </ContainerToolButton>
  </MobileOverflowMenu>
</div>
```

### How It Works

**Desktop (`md` and up):**
- Uses `hidden md:contents` to render children inline
- Shows dropdown menus and icon buttons normally
- No three-dot button visible

**Mobile (below `md`):**
- Hides all children
- Shows three-dot (MoreVertical) button
- Opens bottom drawer on click
- Automatically converts `ContainerToolButton` with `data-drawer-label` to drawer menu items
- Passes through `MobileDrawerButton` items as-is (for flattening nested menus)
- Auto-closes drawer after any action (100ms delay)

### data-drawer-label Attribute

Add `data-drawer-label` to `ContainerToolButton` to provide text for the mobile drawer menu. Icon-only buttons on desktop become labeled menu items on mobile.

```tsx
<ContainerToolButton
  size="icon"
  onClick={handleRefresh}
  data-drawer-label="Refresh"  // ← Text shown in mobile drawer
>
  <RefreshCw className="h-4 w-4" />
</ContainerToolButton>
```

### MobileDrawerButton

Use `MobileDrawerButton` for items that should only appear in the mobile drawer (not on desktop). Useful for flattening nested menus.

```tsx
interface MobileDrawerButtonProps {
  onClick: () => void;
  icon?: ReactNode;      // Optional leading icon
  children: ReactNode;   // Button label text
  className?: string;    // Optional additional classes
}
```

**Styling:**
- Borderless design with hover state (`hover:bg-accent`)
- Height: `h-12` (48px) for comfortable touch targets
- Padding: `px-4` (16px horizontal)
- Icon spacing: `mr-3` (12px between icon and text)
- Left-aligned text with flex layout

**Use Case:** Flatten nested menus on mobile. Desktop shows a dropdown menu, mobile shows individual drawer items.

### Design Specifications

**Drawer Container:**
- Position: `fixed inset-0 z-50` (fullscreen overlay)
- Visibility: `md:hidden` (mobile only)
- Background overlay: `bg-black/80` with fade-in animation
- Drawer panel: `bottom-0 left-0 right-0` with slide-up animation
- Border: `border-t` with `rounded-t-lg`

**Drawer Header:**
- Padding: `p-4 pb-2`
- Title: `text-lg font-semibold`
- Close button: `h-9 w-9` with `X` icon (`h-6 w-6`, `strokeWidth={2.5}`)
- Close button colors: `text-gray-400 hover:text-gray-300`

**Button Container:**
- Padding: `p-2 pb-6` (tighter spacing, extra bottom for safe area)
- Layout: `flex flex-col` (stacked buttons)

### Clipboard Implementation

For clipboard operations to work from the drawer, use synchronous `execCommand` as primary method:

```tsx
const copyToClipboardSync = (text: string): boolean => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "50%";
    textArea.style.left = "50%";
    textArea.style.opacity = "0";
    textArea.style.zIndex = "9999";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    return false;
  }
};

const handleCopy = () => {
  const success = copyToClipboardSync(content);
  if (success) {
    toast.success("Copied to clipboard");
  } else {
    // Fallback to async API if needed
    navigator.clipboard.writeText(content)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  }
  setTimeout(() => setDrawerOpen(false), 100);
};
```

**Why `execCommand` first:**
- Synchronous operation completes within the user gesture event
- More reliable from fixed-position overlays on mobile
- Modern Clipboard API can still be used as fallback

### When to Use

✅ **Use MobileOverflowMenu when:**
- Toolbar has too many tools to fit on mobile
- Tools include clipboard operations or secure APIs
- Need to maintain user gesture context on mobile
- Want automatic responsive behavior

❌ **Don't use when:**
- All tools fit comfortably on mobile
- Desktop-only feature (no mobile users)
- Tools are simple links (can use responsive visibility instead)

### Complete Example from DocumentDetail.tsx

```tsx
<MobileOverflowMenu title="More Options" disabled={!documentData}>
  {/* Icon button → labeled drawer item */}
  <ContainerToolButton
    size="icon"
    onClick={handleRefresh}
    data-drawer-label="Refresh"
  >
    <RefreshCw className="h-4 w-4" />
  </ContainerToolButton>

  {/* Desktop: Dropdown menu (shown inline) */}
  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
    <DropdownMenuTrigger asChild>
      <ContainerToolButton size="sm" disabled={!documentData}>
        <Copy className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 ml-1" />
      </ContainerToolButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild>
        <button onClick={() => { handleCopyContent(); setDropdownOpen(false); }}>
          <Copy className="h-4 w-4 mr-2" />
          Copy content
        </button>
      </DropdownMenuItem>
      {/* More dropdown items... */}
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Mobile: Flattened drawer items (replace dropdown hierarchy) */}
  <MobileDrawerButton onClick={handleCopyContent} icon={<Copy className="h-4 w-4" />}>
    Copy content
  </MobileDrawerButton>
  <MobileDrawerButton onClick={handleCopyAbsolutePath} icon={<Copy className="h-4 w-4" />}>
    Copy absolute path
  </MobileDrawerButton>
  <MobileDrawerButton onClick={handleCopyRelativePath} icon={<Copy className="h-4 w-4" />}>
    Copy relative path
  </MobileDrawerButton>

  {/* Destructive button → red drawer item */}
  <ContainerToolButton
    size="icon"
    onClick={handleOpenDeleteDialog}
    variant="destructive"
    data-drawer-label="Delete"
  >
    <Trash2 className="h-4 w-4" />
  </ContainerToolButton>
</MobileOverflowMenu>
```

**Result:**
- **Desktop:** Shows Refresh icon | Copy▼ dropdown | Delete icon
- **Mobile:** Shows ⋮ → Drawer with: Refresh, Copy content, Copy absolute path, Copy relative path, Delete (red)

## Responsive Visibility

### Hide on Mobile

```tsx
<span className="hidden md:inline">Desktop Only</span>
```

### Show Only on Mobile

```tsx
<span className="md:hidden">Mobile Only</span>
```

### Different Content for Mobile/Desktop

```tsx
<div>
  <span className="md:hidden">Mobile Content</span>
  <span className="hidden md:inline">Desktop Content</span>
</div>
```

### Responsive Icon Margin

```tsx
// Margin only on desktop (removed on mobile for icon-only button)
<Icon className="h-4 w-4 md:mr-2" />
<span className="hidden md:inline">Text</span>
```

## Secondary Nav Search Input

Use the shared `SecondaryNavSearch` component for all search inputs in secondary nav panels. It provides a consistent borderless style with a search icon and a clear (X) button.

**Location:** `src/components/navigation/SecondaryNavSearch.tsx`

### Props

- `value` — controlled search string
- `onChange` — callback receiving the new string value (also called with `""` when cleared)
- `placeholder` — optional, defaults to `"Search..."`

### Implementation

```tsx
import { SecondaryNavSearch } from "@/components/navigation/SecondaryNavSearch";

<div className="px-6 pb-4">
  <SecondaryNavSearch
    placeholder="Search items..."
    value={searchInput}
    onChange={setSearchInput}
  />
</div>
```

### Behavior

- Search icon on the left (non-interactive)
- Clear (X) button appears on the right when there is a value
- Clicking X calls `onChange("")` to reset
- No border, no focus ring — blends with the nav background

### Examples in Codebase

- `ProjectsSecondaryNav` — search projects by name
- `TodosSecondaryNav` — search todos by name
- `ChatSecondaryNav` — search groups by name (all-groups view)
