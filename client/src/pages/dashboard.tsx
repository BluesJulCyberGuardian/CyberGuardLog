import { useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { AlertCard } from "@/components/alert-card";
import { LogEntry } from "@/components/log-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Activity, Wifi, AlertTriangle, Radio } from "lucide-react";
import type { Alert, Log, Metric } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogStream } from "@/hooks/use-log-stream";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [liveLogsCount, setLiveLogsCount] = useState(0);
  
  const { data: metrics, isLoading: metricsLoading } = useQuery<Metric[]>({
    queryKey: ["/api/metrics"],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<Log[]>({
    queryKey: ["/api/logs/recent"],
  });

  // Set up real-time log streaming
  const { isConnected } = useLogStream(
    (newLog) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setLiveLogsCount(prev => prev + 1);
    },
    (newAlert) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    }
  );

  // Calculate aggregated metrics
  const threatCount = metrics?.filter(m => m.metricType === "threat_count").reduce((sum, m) => sum + m.value, 0) || 0;
  const activeConnections = metrics?.find(m => m.metricType === "active_connections")?.value || 0;
  const bandwidth = metrics?.find(m => m.metricType === "bandwidth")?.value || 0;
  const activeAlerts = alerts?.filter(a => a.status === "active").length || 0;

  // Generate traffic chart data from metrics API
  const trafficData = metrics ? (() => {
    // Get traffic and threat metrics
    const trafficMetrics = metrics
      .filter(m => m.metricType === "traffic_volume")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const threatMetrics = metrics
      .filter(m => m.metricType === "hourly_threats")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Combine into chart data
    return trafficMetrics.map((traffic, i) => ({
      time: new Date(traffic.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', hour12: false }) + ':00',
      traffic: traffic.value,
      threats: threatMetrics[i]?.value || 0,
    }));
  })() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time network monitoring and threat detection</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`} data-testid="status-websocket">
            <Radio className="w-3 h-3" />
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Active Threats"
              value={threatCount}
              unit="detected"
              trend="down"
              trendValue="12% from yesterday"
              icon={Shield}
              testId="metric-threats"
            />
            <MetricCard
              title="Active Connections"
              value={activeConnections}
              unit="connections"
              trend="stable"
              trendValue="No change"
              icon={Wifi}
              testId="metric-connections"
            />
            <MetricCard
              title="Network Traffic"
              value={bandwidth}
              unit="Mbps"
              trend="up"
              trendValue="8% increase"
              icon={Activity}
              testId="metric-bandwidth"
            />
            <MetricCard
              title="Critical Alerts"
              value={activeAlerts}
              unit="active"
              trend="down"
              trendValue="5 resolved today"
              icon={AlertTriangle}
              testId="metric-alerts"
            />
          </>
        )}
      </div>

      {/* Charts and Data */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Traffic Chart - Spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Network Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="traffic"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alert Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {alertsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-4" data-testid="alert-feed">
                  {alerts.slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No active alerts
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Live Log Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Live Log Stream</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {logsLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-1" data-testid="log-stream">
                {logs.map((log, index) => (
                  <LogEntry key={log.id} log={log} index={index} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No logs available
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
