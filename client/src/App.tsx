import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import LogAnalysis from "@/pages/log-analysis";
import AlertManagement from "@/pages/alert-management";
import NetworkMonitor from "@/pages/network-monitor";
import RulesManagement from "@/pages/rules-management";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/logs" component={LogAnalysis} />
      <Route path="/alerts" component={AlertManagement} />
      <Route path="/network" component={NetworkMonitor} />
      <Route path="/rules" component={RulesManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { currentUser } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span data-testid="text-current-user">{currentUser?.username}</span>
              <div className="h-2 w-2 rounded-full bg-status-online animate-pulse" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-full h-screen" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          window.location.reload();
        }}
      />
    );
  }

  return (
    <TooltipProvider>
      <AppLayout />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticatedApp />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
