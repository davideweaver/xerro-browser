import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
} from "react-router-dom";
import lazyImportComponent from "@/lib/lazyImportComponent";
import Layout from "./Layout";

const Router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route
        index
        lazy={lazyImportComponent(() => import("@/pages/Today"))}
      />
      <Route
        path="/home/calendar"
        lazy={lazyImportComponent(() => import("@/pages/Calendar"))}
      />
      <Route
        path="/home/notifications"
        lazy={lazyImportComponent(() => import("@/pages/Notifications"))}
      />
      <Route
        path="/home/favorites"
        lazy={lazyImportComponent(() => import("@/pages/FeedsFavorites"))}
      />
      <Route
        path="/home/feeds/:topicId"
        lazy={lazyImportComponent(() => import("@/pages/FeedsTopic"))}
      />
      <Route
        path="/projects"
        lazy={lazyImportComponent(() => import("@/pages/Projects"))}
      />
      <Route
        path="/project/:projectName"
        lazy={lazyImportComponent(() => import("@/pages/ProjectDetail"))}
      />
      <Route
        path="/project/:projectName/sessions"
        lazy={lazyImportComponent(() => import("@/pages/Sessions"))}
      />
      <Route
        path="/project/:projectName/sessions/:sessionId"
        lazy={lazyImportComponent(() => import("@/pages/XerroSessionDetail"))}
      />
      <Route
        path="/documents"
        lazy={lazyImportComponent(() => import("@/pages/Documents"))}
      />
      <Route
        path="/documents/search"
        lazy={lazyImportComponent(() => import("@/pages/DocumentSearch"))}
      />
      <Route
        path="/documents/*"
        lazy={lazyImportComponent(() => import("@/pages/DocumentDetail"))}
      />

      {/* Memory overview */}
      <Route
        path="/memory/overview"
        lazy={lazyImportComponent(() => import("@/pages/MemoryOverview"))}
      />
      <Route
        path="/memory/system"
        lazy={lazyImportComponent(() => import("@/pages/CoreMemory"))}
      />

      {/* Memory Blocks routes */}
      <Route
        path="/memory/blocks"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlocks"))}
      />
      <Route
        path="/memory/blocks/*"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlockDetail"))}
      />

      {/* Memory sub-routes */}
      <Route
        path="/memory/search"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlockSearch"))}
      />
      <Route
        path="/memory/sessions"
        lazy={lazyImportComponent(() => import("@/pages/Sessions"))}
      />
      <Route
        path="/memory/sessions/:sessionId"
        lazy={lazyImportComponent(() => import("@/pages/XerroSessionDetail"))}
      />

      {/* Chat routes */}
      <Route
        path="/chat"
        lazy={lazyImportComponent(() => import("@/pages/ChatSessions"))}
      />
      <Route
        path="/chat/search"
        lazy={lazyImportComponent(() => import("@/pages/ChatSessionSearch"))}
      />
      <Route
        path="/chat/:sessionId"
        lazy={lazyImportComponent(() => import("@/pages/ChatSession"))}
      />

      {/* Todos route */}
      <Route
        path="/todos"
        lazy={lazyImportComponent(() => import("@/pages/Todos"))}
      />

      {/* Agent Tasks routes */}
      <Route
        path="/agent-tasks"
        lazy={lazyImportComponent(() => import("@/pages/AgentTasks"))}
      />
      <Route
        path="/agent-tasks/activity"
        lazy={lazyImportComponent(() => import("@/pages/TaskActivity"))}
      />
      <Route
        path="/agent-tasks/history"
        lazy={lazyImportComponent(() => import("@/pages/AgentTaskHistory"))}
      />
      {/* Named routes must appear before /:id to prevent matching as a task ID */}
      <Route
        path="/agent-tasks/scheduled"
        lazy={lazyImportComponent(() => import("@/pages/AgentTasksScheduled"))}
      />
      <Route
        path="/agent-tasks/agents/:agentId/config"
        lazy={lazyImportComponent(() => import("@/pages/AgentDetailConfig"))}
      />
      <Route
        path="/agent-tasks/agents/:agentId/triggers"
        lazy={lazyImportComponent(() => import("@/pages/AgentDetailTriggers"))}
      />
      <Route
        path="/agent-tasks/agents/:agentId/history"
        lazy={lazyImportComponent(() => import("@/pages/AgentDetailHistory"))}
      />
      <Route
        path="/agent-tasks/agents/:agentId/files"
        lazy={lazyImportComponent(() => import("@/pages/AgentDetailFiles"))}
      />
      <Route
        path="/agent-tasks/agents/:agentId/chat"
        lazy={lazyImportComponent(() => import("@/pages/AgentDetailChat"))}
      />
      <Route
        path="/agent-tasks/messages"
        lazy={lazyImportComponent(() => import("@/pages/AgentTaskMessages"))}
      />
      <Route
        path="/agent-tasks/messages/:threadId"
        lazy={lazyImportComponent(() => import("@/pages/AgentTaskMessages"))}
      />
      <Route
        path="/agent-tasks/:id"
        lazy={lazyImportComponent(() => import("@/pages/AgentTaskDetail"))}
      />

      {/* System routes */}
      <Route
        path="/system"
        lazy={lazyImportComponent(() => import("@/pages/System"))}
      />
      <Route
        path="/system/today"
        lazy={lazyImportComponent(() => import("@/pages/TodaySettings"))}
      />
      <Route
        path="/system/xerro-service"
        lazy={lazyImportComponent(() => import("@/pages/XerroServiceStatus"))}
      />
      <Route
        path="/system/llamacpp-servers"
        lazy={lazyImportComponent(() => import("@/pages/LlamacppServers"))}
      />
      <Route
        path="/system/llamacpp-models"
        lazy={lazyImportComponent(() => import("@/pages/LlamacppModels"))}
      />
      <Route
        path="/system/llamacpp-router"
        lazy={lazyImportComponent(() => import("@/pages/LlamacppRouter"))}
      />
      <Route
        path="/system/logs/xerro"
        lazy={lazyImportComponent(() => import("@/pages/XerroLogs"))}
      />
      <Route
        path="/system/logs/router"
        lazy={lazyImportComponent(() => import("@/pages/RouterLogs"))}
      />
      <Route
        path="/system/logs/server/:serverId"
        lazy={lazyImportComponent(() => import("@/pages/ServerLogs"))}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  ),
  {
    future: {
      // @ts-expect-error - future flag for react-router-dom v7 compat
      v7_startTransition: true,
    },
  }
);

export default Router;
