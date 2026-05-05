import {
  Home,
  FolderKanban,
  Brain,
  Search,
  Clock,
  FileText,
  Bot,
  ListTodo,
  BookMarked,
  MessagesSquare,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SecondaryNavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

export interface PrimaryNavItem {
  key: string;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  defaultPath: string;
  secondaryItems: SecondaryNavItem[];
}

export const navigationConfig: PrimaryNavItem[] = [
  {
    key: 'home',
    icon: Home,
    label: 'Home',
    defaultPath: '/',
    secondaryItems: []
  },
  {
    key: 'messages',
    icon: Inbox,
    label: 'Inbox',
    defaultPath: '/inbox',
    secondaryItems: []
  },
  {
    key: 'todos',
    icon: ListTodo,
    label: 'Todos',
    defaultPath: '/todos',
    secondaryItems: []
  },
  {
    key: 'chat',
    icon: MessagesSquare,
    iconClassName: '[&_svg]:!size-6',
    label: 'Chat',
    defaultPath: '/chat',
    secondaryItems: []
  },
  {
    key: 'projects',
    icon: FolderKanban,
    label: 'Projects',
    defaultPath: '/projects',
    secondaryItems: []
  },
  {
    key: 'documents',
    icon: FileText,
    label: 'Documents',
    defaultPath: '/documents',
    secondaryItems: []
  },
  {
    key: 'memory',
    icon: Brain,
    label: 'Memory',
    defaultPath: '/memory/overview',
    secondaryItems: [
      { path: '/memory/search', icon: Search, label: 'Search' },
      { path: '/memory/sessions', icon: Clock, label: 'Sessions' },
      { path: '/memory/blocks', icon: BookMarked, label: 'Blocks' }
    ]
  },
  {
    key: 'agent-tasks',
    icon: Bot,
    iconClassName: '[&_svg]:!size-6',
    label: 'Agents',
    defaultPath: '/agent-tasks/activity',
    secondaryItems: []
  }
];

export function getActivePrimary(pathname: string): string | null {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  // Project routes - including project-specific sessions
  if (pathname.startsWith('/projects') || pathname.startsWith('/project/')) return 'projects';
  if (pathname.startsWith('/documents')) return 'documents';
  // Memory routes
  if (pathname.startsWith('/memory')) return 'memory';
  // Todos routes
  if (pathname.startsWith('/todos')) return 'todos';
  if (pathname.startsWith('/chat')) return 'chat';
  // Inbox routes
  if (pathname.startsWith('/inbox')) return 'messages';
  // Agent Tasks routes
  if (pathname.startsWith('/agent-tasks')) return 'agent-tasks';
  if (pathname.startsWith('/system')) return 'system';
  return null;
}

export function getActivePrimaryConfig(pathname: string): PrimaryNavItem | null {
  const activePrimary = getActivePrimary(pathname);
  if (!activePrimary) return null;
  return navigationConfig.find(item => item.key === activePrimary) || null;
}
