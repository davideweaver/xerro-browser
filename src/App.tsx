import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardProvider } from "@/context/DashboardContext";
import { XerroWebSocketProvider } from "@/context/XerroWebSocketContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { LoginPage } from "@/components/auth/LoginPage";
import Router from "@/layout/Router";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AuthenticatedApp() {
  usePushNotifications();
  return (
    <XerroWebSocketProvider>
      <DashboardProvider>
        <RouterProvider
          router={Router}
          future={{ v7_startTransition: true }}
        />
      </DashboardProvider>
    </XerroWebSocketProvider>
  );
}

function AuthGate() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
