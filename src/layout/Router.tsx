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
        path="/home/stats"
        lazy={lazyImportComponent(() => import("@/pages/Stats"))}
      />
      <Route
        path="/home/notifications"
        lazy={lazyImportComponent(() => import("@/pages/Notifications"))}
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

      {/* Memory Blocks routes */}
      <Route
        path="/memory/blocks"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlocks"))}
      />
      <Route
        path="/memory/blocks/search"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlockSearch"))}
      />
      <Route
        path="/memory/blocks/*"
        lazy={lazyImportComponent(() => import("@/pages/MemoryBlockDetail"))}
      />

      {/* Memory sub-routes */}
      <Route
        path="/memory/search"
        lazy={lazyImportComponent(() => import("@/pages/Search"))}
      />
      <Route
        path="/memory/chat"
        lazy={lazyImportComponent(() => import("@/pages/Chat"))}
      />
      <Route
        path="/memory/entities"
        lazy={lazyImportComponent(() => import("@/pages/Entities"))}
      />
      <Route
        path="/memory/entities/:type"
        lazy={lazyImportComponent(() => import("@/pages/Entities"))}
      />
      <Route
        path="/memory/entity/:uuid"
        lazy={lazyImportComponent(() => import("@/pages/EntityDetail"))}
      />
      <Route
        path="/memory/sessions"
        lazy={lazyImportComponent(() => import("@/pages/Sessions"))}
      />
      <Route
        path="/memory/sessions/:sessionId"
        lazy={lazyImportComponent(() => import("@/pages/XerroSessionDetail"))}
      />
      <Route
        path="/memory/add"
        lazy={lazyImportComponent(() => import("@/pages/AddMemory"))}
      />
      <Route
        path="/memory/facts/:uuid"
        lazy={lazyImportComponent(() => import("@/pages/FactDetail"))}
      />
      <Route
        path="/memory/processing/:sourceUuid"
        lazy={lazyImportComponent(() => import("@/pages/ProcessingResults"))}
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
