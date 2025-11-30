import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCard } from "@/components/alert-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AlertManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/alerts/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    },
  });

  // Filter alerts
  const filteredAlerts = alerts?.filter((alert) => {
    const matchesSearch =
      searchQuery === "" ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusTab === "all" || alert.status === statusTab;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityOptions = [
    { label: "Critical", value: "critical" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
    { label: "Info", value: "info" },
  ];

  const activeFilters = [
    severityFilter !== "all" && `Severity: ${severityFilter}`,
  ].filter(Boolean) as string[];

  const alertCounts = {
    active: alerts?.filter((a) => a.status === "active").length || 0,
    acknowledged: alerts?.filter((a) => a.status === "acknowledged").length || 0,
    resolved: alerts?.filter((a) => a.status === "resolved").length || 0,
    all: alerts?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Alert Management</h1>
        <p className="text-sm text-muted-foreground">
          Monitor and manage security alerts across your infrastructure
        </p>
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList data-testid="tabs-alert-status">
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({alertCounts.active})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" data-testid="tab-acknowledged">
            Acknowledged ({alertCounts.acknowledged})
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">
            Resolved ({alertCounts.resolved})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({alertCounts.all})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <SearchFilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                  {
                    label: "Severity",
                    value: severityFilter,
                    options: severityOptions,
                    onChange: setSeverityFilter,
                  },
                ]}
                activeFilters={activeFilters}
                onRemoveFilter={(filter) => {
                  if (filter.startsWith("Severity:")) setSeverityFilter("all");
                }}
              />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : filteredAlerts && filteredAlerts.length > 0 ? (
                <div className="space-y-4" data-testid="alert-list">
                  {filteredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                      onResolve={(id) => resolveMutation.mutate(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || activeFilters.length > 0
                        ? "No alerts match your filters"
                        : `No ${statusTab} alerts`}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
