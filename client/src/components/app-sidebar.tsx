import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Shield, LayoutDashboard, FileText, AlertTriangle, Activity, Settings, Zap, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Log Analysis",
    url: "/logs",
    icon: FileText,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Network Monitor",
    url: "/network",
    icon: Activity,
  },
  {
    title: "Alerting Rules",
    url: "/rules",
    icon: Zap,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">CyberGuard</span>
            <span className="text-xs text-muted-foreground">Security Platform</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div className="h-2 w-2 rounded-full bg-status-online" />
          <span>System Online</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
