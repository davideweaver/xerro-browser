import {
  Home,
  FolderKanban,
  Brain,
  Search,
  MessageSquare,
  Users,
  Clock,
  Plus,
  FileText,
  Bot,
  ListTodo,
  Settings,
  Calendar,
  BarChart3,
  Bell,
  BookMarked,
  MessagesSquare,
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
    secondaryItems: [
      { path: '/', icon: Calendar, label: 'Today' },
      { path: '/home/stats', icon: BarChart3, label: 'Stats' },
      { path: '/home/notifications', icon: Bell, label: 'Notifications' }
    ]
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
      { path: '/memory/chat', icon: MessageSquare, label: 'Chat' },
      { path: '/memory/entities', icon: Users, label: 'Entities' },
      { path: '/memory/sessions', icon: Clock, label: 'Sessions' },
      { path: '/memory/add', icon: Plus, label: 'Add Memory' },
      { path: '/memory/blocks', icon: BookMarked, label: 'Blocks' }
    ]
  },
  {
    key: 'todos',
    icon: ListTodo,
    label: 'Todos',
    defaultPath: '/todos',
    secondaryItems: []
  },
  {
    key: 'agent-tasks',
    icon: Bot,
    iconClassName: '[&_svg]:!size-6',
    label: 'Agent Tasks',
    defaultPath: '/agent-tasks/activity',
    secondaryItems: []
  },
  {
    key: 'system',
    icon: Settings,
    iconClassName: '[&_svg]:!size-6',
    label: 'System',
    defaultPath: '/system',
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
  // Agent Tasks routes
  if (pathname.startsWith('/chat')) return 'chat';
  if (pathname.startsWith('/agent-tasks')) return 'agent-tasks';
  // System routes
  if (pathname.startsWith('/system')) return 'system';
  return null;
}

export function getActivePrimaryConfig(pathname: string): PrimaryNavItem | null {
  const activePrimary = getActivePrimary(pathname);
  if (!activePrimary) return null;
  return navigationConfig.find(item => item.key === activePrimary) || null;
}
