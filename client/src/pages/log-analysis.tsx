import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/components/log-entry";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { useQuery } from "@tanstack/react-query";
import type { Log } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";

export default function LogAnalysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: logs, isLoading } = useQuery<Log[]>({
    queryKey: ["/api/logs"],
  });

  // Filter logs based on search and filters
  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;

    return matchesSearch && matchesLevel && matchesSource;
  });

  const levelOptions = [
    { label: "Critical", value: "critical" },
    { label: "Error", value: "error" },
    { label: "Warning", value: "warning" },
    { label: "Info", value: "info" },
  ];

  const sourceOptions = [
    { label: "Application", value: "application" },
    { label: "System", value: "system" },
    { label: "Network", value: "network" },
    { label: "Security", value: "security" },
  ];

  const activeFilters = [
    levelFilter !== "all" && `Level: ${levelFilter}`,
    sourceFilter !== "all" && `Source: ${sourceFilter}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Log Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Search and analyze security logs across all sources
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                label: "Level",
                value: levelFilter,
                options: levelOptions,
                onChange: setLevelFilter,
              },
              {
                label: "Source",
                value: sourceFilter,
                options: sourceOptions,
                onChange: setSourceFilter,
              },
            ]}
            activeFilters={activeFilters}
            onRemoveFilter={(filter) => {
              if (filter.startsWith("Level:")) setLevelFilter("all");
              if (filter.startsWith("Source:")) setSourceFilter("all");
            }}
          />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="space-y-1" data-testid="log-list">
                {filteredLogs.map((log, index) => (
                  <LogEntry key={log.id} log={log} index={index} />
                ))}
              </div>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || activeFilters.length > 0
                      ? "No logs match your filters"
                      : "No logs available"}
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredLogs && filteredLogs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-total-logs">
                {filteredLogs.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-critical-logs">
                {filteredLogs.filter((l) => l.level === "critical").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-error-logs">
                {filteredLogs.filter((l) => l.level === "error").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-warning-logs">
                {filteredLogs.filter((l) => l.level === "warning").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Warnings</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
