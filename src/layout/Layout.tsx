import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useTasksRunning } from "@/hooks/use-tasks-running";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { useDocumentQueryUpdates } from "@/hooks/use-document-query-updates";
import { useMemoryQueryUpdates } from "@/hooks/use-memory-query-updates";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { WifiOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Animation duration for mobile nav gestures (in ms)
const MOBILE_NAV_ANIMATION_DURATION = 200;
import { PrimaryNav } from "@/components/navigation/PrimaryNav";
import { SecondaryNav } from "@/components/navigation/SecondaryNav";
import { HomeSecondaryNav } from "@/components/navigation/HomeSecondaryNav";
import { ProjectsSecondaryNav } from "@/components/navigation/ProjectsSecondaryNav";
import { DocumentsSecondaryNav } from "@/components/navigation/DocumentsSecondaryNav";
import { AgentTasksSecondaryNav } from "@/components/navigation/AgentTasksSecondaryNav";
import { ChatSecondaryNav } from "@/components/navigation/ChatSecondaryNav";
import { TodosSecondaryNav } from "@/components/navigation/TodosSecondaryNav";
import { SystemSecondaryNav } from "@/components/navigation/SystemSecondaryNav";
import { MemoryBlocksSecondaryNav } from "@/components/navigation/MemoryBlocksSecondaryNav";
import { MobileNavTrigger } from "@/components/navigation/MobileNavTrigger";
import { DraggableMobileNav } from "@/components/navigation/DraggableMobileNav";
import { ProfileMenu } from "@/components/navigation/ProfileMenu";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { navigationConfig, getActivePrimary } from "@/lib/navigationConfig";
import {
  getCurrentFolderPath,
  setCurrentFolderPath as saveCurrentFolderPath,
  setLastDocumentPath,
  getLastDocumentPath,
} from "@/lib/documentsStorage";

const Layout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { isConnected: xerroIsConnected } = useXerroWebSocketContext();
  const isTasksRunning = useTasksRunning();
  const { unreadCount } = useUnreadNotificationCount();
  useDocumentQueryUpdates();
  useMemoryQueryUpdates();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState<string>(() =>
    getCurrentFolderPath()
  );

  const activePrimary = getActivePrimary(pathname);

  // Drag-to-open state: tracks progress when swiping from left edge
  const [dragOpenProgress, setDragOpenProgress] = useState(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isDraggingOpenRef = useRef(false);
  const hasCheckedDirectionRef = useRef(false);

  // Handle swipe from left edge to open nav
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return; // Only on mobile
      if (mobileNavOpen) return; // Already open

      const touch = e.touches[0];
      // Start tracking if touch begins within 50px of left edge
      if (touch.pageX <= 50) {
        touchStartXRef.current = touch.pageX;
        touchStartYRef.current = touch.pageY;
        isDraggingOpenRef.current = true;
        hasCheckedDirectionRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingOpenRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.pageX - touchStartXRef.current;
      const deltaY = touch.pageY - touchStartYRef.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check direction on first significant movement (5px threshold)
      if (!hasCheckedDirectionRef.current && (absDeltaX > 5 || absDeltaY > 5)) {
        hasCheckedDirectionRef.current = true;
        if (absDeltaY > absDeltaX) {
          // More vertical - cancel drag, allow normal scrolling
          isDraggingOpenRef.current = false;
          setDragOpenProgress(0);
          return;
        }
      }

      // Track rightward drag progress as percentage of screen width
      if (deltaX > 0) {
        const progress = Math.min(deltaX / window.innerWidth, 1);
        setDragOpenProgress(progress);

        // Prevent page scrolling during horizontal drag
        if (absDeltaX > absDeltaY && deltaX > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingOpenRef.current) return;

      // Snap threshold: 40% of screen width
      if (dragOpenProgress > 0.4) {
        // Complete the opening animation
        const startProgress = dragOpenProgress;
        const startTime = Date.now();

        const animateOpen = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / MOBILE_NAV_ANIMATION_DURATION, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const currentProgress = startProgress + (1 - startProgress) * easedProgress;

          setDragOpenProgress(currentProgress);

          if (progress < 1) {
            requestAnimationFrame(animateOpen);
          } else {
            setDragOpenProgress(0);
            setMobileNavOpen(true);
          }
        };

        requestAnimationFrame(animateOpen);
      } else {
        // Snap back to closed
        const startProgress = dragOpenProgress;
        const startTime = Date.now();

        const animateClose = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / MOBILE_NAV_ANIMATION_DURATION, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const currentProgress = startProgress * (1 - easedProgress);

          setDragOpenProgress(currentProgress);

          if (progress < 1) {
            requestAnimationFrame(animateClose);
          } else {
            setDragOpenProgress(0);
          }
        };

        requestAnimationFrame(animateClose);
      }

      // Reset drag state
      isDraggingOpenRef.current = false;
      hasCheckedDirectionRef.current = false;
      touchStartXRef.current = 0;
      touchStartYRef.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mobileNavOpen, dragOpenProgress]);

  // iOS Safari: Prevent back/forward browser navigation gestures
  // This must be at document level to intercept before the browser claims the gesture
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return; // Only on mobile

      const touch = e.touches[0];
      // Block browser gestures that start within 20px of screen edges
      if (touch.pageX <= 20 || touch.pageX >= window.innerWidth - 20) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    return () => document.removeEventListener("touchstart", handleTouchStart);
  }, []);

  // Get selected project from URL params
  const selectedProject = params.projectName ? decodeURIComponent(params.projectName) : null;
  const isProjectsSection = activePrimary === "projects";

  // Get current document path from URL params for Documents section
  const currentDocumentPath = params["*"] || null;
  const isDocumentsSection = activePrimary === "documents";

  // Get selected task ID from URL params for Agent Tasks section
  const selectedTaskId = params.id || null;
  const isAgentTasksSection = activePrimary === "agent-tasks";

  // Home section flag
  const isHomeSection = activePrimary === "home";
  const selectedTopicId = params.topicId || null;

  // Chat section flag
  const isChatSection = activePrimary === "chat";
  const selectedChatSessionId = params.sessionId || null;

  // Todos section flag
  const isTodosSection = activePrimary === "todos";

  // System section flag
  const isSystemSection = activePrimary === "system";

  // Memory Blocks section flag (sub-section of memory) - also active on /memory/sessions and /memory/overview
  const isMemoryBlocksSection = pathname.startsWith("/memory/blocks") || pathname.startsWith("/memory/sessions") || pathname.startsWith("/memory/overview") || pathname.startsWith("/memory/search") || pathname.startsWith("/memory/system");
  const currentMemoryBlockLabel = pathname.startsWith("/memory/blocks") ? (params["*"] || null) : null;
  const [currentMemoryFolder, setCurrentMemoryFolder] = useState<string>("");

  // Determine current view for Agent Tasks section
  const getAgentTasksView = (): "history" | "task" | "activity" => {
    if (pathname === "/agent-tasks/activity") return "activity";
    if (pathname === "/agent-tasks/history") return "history";
    if (selectedTaskId) return "task";
    return "history"; // Default
  };
  const agentTasksView = getAgentTasksView();

  // Save folder path to localStorage whenever it changes
  useEffect(() => {
    saveCurrentFolderPath(currentFolderPath);
  }, [currentFolderPath]);

  // Save current document to localStorage when viewing a document
  useEffect(() => {
    if (isDocumentsSection && currentDocumentPath) {
      setLastDocumentPath(currentDocumentPath);
    }
  }, [isDocumentsSection, currentDocumentPath]);

  // Restore last viewed document when navigating back to Documents root
  useEffect(() => {
    if (isDocumentsSection && pathname === "/documents") {
      const lastDoc = getLastDocumentPath();
      if (lastDoc) {
        navigate(`/documents/${lastDoc}`, { replace: true });
      }
    }
  }, [isDocumentsSection, pathname, navigate]);

  // Listen for folder change events from document detail page
  useEffect(() => {
    const handleFolderChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ folderPath: string }>;
      if (customEvent.detail?.folderPath) {
        setCurrentFolderPath(customEvent.detail.folderPath);
      }
    };

    window.addEventListener("documents-folder-change", handleFolderChange);
    return () => {
      window.removeEventListener("documents-folder-change", handleFolderChange);
    };
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleMobileNavigate = (path: string) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  const footer = (
    <ProfileMenu
      onAfterClick={() => setMobileNavOpen(false)}
    />
  );

  // Indicators for navigation items
  const navIndicators = {
    "agent-tasks": isTasksRunning ? (
      <div className="relative flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
      </div>
    ) : null,
    "home": unreadCount > 0 ? (
      <NotificationBadge count={unreadCount} size="sm" />
    ) : !xerroIsConnected ? (
      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500">
        <WifiOff className="w-2.5 h-2.5 text-white" />
      </div>
    ) : null,
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen">
        {/* Primary Navigation - 75px */}
        <PrimaryNav
          navigationConfig={navigationConfig}
          activePrimary={activePrimary}
          onNavigate={handleNavigate}
          footer={footer}
          indicators={navIndicators}
        />

        {/* Secondary Navigation - 380px */}
        {isDocumentsSection ? (
          <DocumentsSecondaryNav
            currentDocumentPath={currentDocumentPath}
            currentFolderPath={currentFolderPath}
            onFolderChange={setCurrentFolderPath}
            onNavigate={handleNavigate}
          />
        ) : isMemoryBlocksSection ? (
          <MemoryBlocksSecondaryNav
            currentBlockLabel={currentMemoryBlockLabel}
            currentFolder={currentMemoryFolder}
            onFolderChange={setCurrentMemoryFolder}
            onNavigate={handleNavigate}
          />
        ) : isProjectsSection ? (
          <ProjectsSecondaryNav
            selectedProject={selectedProject}
            onNavigate={handleNavigate}
          />
        ) : isAgentTasksSection ? (
          <AgentTasksSecondaryNav
            selectedTaskId={selectedTaskId}
            currentView={agentTasksView}
            onNavigate={handleNavigate}
          />
        ) : isChatSection ? (
          <ChatSecondaryNav
            selectedSessionId={selectedChatSessionId}
            onNavigate={handleNavigate}
          />
        ) : isTodosSection ? (
          <TodosSecondaryNav onNavigate={handleNavigate} />
        ) : isSystemSection ? (
          <SystemSecondaryNav onNavigate={handleNavigate} />
        ) : isHomeSection ? (
          <HomeSecondaryNav
            pathname={pathname}
            selectedTopicId={selectedTopicId}
            onNavigate={handleNavigate}
          />
        ) : (
          <SecondaryNav
            activePrimary={activePrimary}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden h-screen flex flex-col">
        <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />

        {/* Drag-to-open preview */}
        {dragOpenProgress > 0 && !mobileNavOpen && (
          <div
            className="fixed inset-y-0 left-0 z-40 w-full bg-background shadow-lg pointer-events-none overflow-hidden"
            style={{
              transform: `translateX(${-100 + dragOpenProgress * 100}%)`,
              transition: "none",
            }}
          >
            <div className="flex h-full opacity-50">
              <PrimaryNav
                navigationConfig={navigationConfig}
                activePrimary={activePrimary}
                onNavigate={() => {}}
                footer={footer}
                indicators={navIndicators}
              />
              {isDocumentsSection ? (
                <DocumentsSecondaryNav
                  currentDocumentPath={currentDocumentPath}
                  currentFolderPath={currentFolderPath}
                  onFolderChange={setCurrentFolderPath}
                  onNavigate={() => {}}
                />
              ) : isMemoryBlocksSection ? (
                <MemoryBlocksSecondaryNav
                  currentBlockLabel={currentMemoryBlockLabel}
                  currentFolder={currentMemoryFolder}
                  onFolderChange={setCurrentMemoryFolder}
                  onNavigate={() => {}}
                />
              ) : isProjectsSection ? (
                <ProjectsSecondaryNav
                  selectedProject={selectedProject}
                  onNavigate={() => {}}
                />
              ) : isAgentTasksSection ? (
                <AgentTasksSecondaryNav
                  selectedTaskId={selectedTaskId}
                  currentView={agentTasksView}
                  onNavigate={() => {}}
                />
              ) : isChatSection ? (
                <ChatSecondaryNav
                  selectedSessionId={selectedChatSessionId}
                  onNavigate={() => {}}
                />
              ) : isTodosSection ? (
                <TodosSecondaryNav onNavigate={() => {}} />
              ) : isSystemSection ? (
                <SystemSecondaryNav onNavigate={() => {}} />
              ) : isHomeSection ? (
                <HomeSecondaryNav
                  pathname={pathname}
                  selectedTopicId={selectedTopicId}
                  onNavigate={() => {}}
                />
              ) : (
                <SecondaryNav
                  activePrimary={activePrimary}
                  pathname={pathname}
                  onNavigate={() => {}}
                />
              )}
            </div>
          </div>
        )}

        <DraggableMobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          activePrimary={activePrimary}
          pathname={pathname}
          navigationConfig={navigationConfig}
          onNavigate={handleNavigate}
          footer={footer}
          indicators={navIndicators}
          secondaryNav={
            isDocumentsSection ? (
              <DocumentsSecondaryNav
                currentDocumentPath={currentDocumentPath}
                currentFolderPath={currentFolderPath}
                onFolderChange={setCurrentFolderPath}
                onNavigate={handleNavigate}
                onDocumentSelect={handleMobileNavigate}
              />
            ) : isMemoryBlocksSection ? (
              <MemoryBlocksSecondaryNav
                currentBlockLabel={currentMemoryBlockLabel}
                currentFolder={currentMemoryFolder}
                onFolderChange={setCurrentMemoryFolder}
                onNavigate={handleNavigate}
                onBlockSelect={handleMobileNavigate}
              />
            ) : isProjectsSection ? (
              <ProjectsSecondaryNav
                selectedProject={selectedProject}
                onNavigate={handleNavigate}
                onProjectSelect={handleMobileNavigate}
              />
            ) : isAgentTasksSection ? (
              <AgentTasksSecondaryNav
                selectedTaskId={selectedTaskId}
                currentView={agentTasksView}
                onNavigate={handleNavigate}
                onTaskSelect={handleMobileNavigate}
              />
            ) : isChatSection ? (
              <ChatSecondaryNav
                selectedSessionId={selectedChatSessionId}
                onNavigate={handleNavigate}
                onSessionSelect={handleMobileNavigate}
              />
            ) : isTodosSection ? (
              <TodosSecondaryNav
                onNavigate={handleNavigate}
                onTodoSelect={handleMobileNavigate}
              />
            ) : isSystemSection ? (
              <SystemSecondaryNav
                onNavigate={handleNavigate}
                onItemSelect={handleMobileNavigate}
              />
            ) : isHomeSection ? (
              <HomeSecondaryNav
                pathname={pathname}
                selectedTopicId={selectedTopicId}
                onNavigate={handleNavigate}
                onTopicSelect={handleMobileNavigate}
              />
            ) : undefined
          }
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </>
  );
};

export default Layout;
