import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { NetworkEvent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Globe, Shield, Network } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";

interface NetworkNode {
  id: string;
  ip: string;
  connections: number;
  blocked: number;
  suspicious: number;
  type: "internal" | "external";
}

interface NetworkLink {
  source: string;
  target: string;
  count: number;
  status: "allowed" | "blocked" | "suspicious";
}

export default function NetworkMonitor() {
  const { data: events, isLoading } = useQuery<NetworkEvent[]>({
    queryKey: ["/api/network/events"],
  });
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const activeConnections = events?.filter((e) => e.status === "allowed").length || 0;
  const blockedConnections = events?.filter((e) => e.status === "blocked").length || 0;
  const suspiciousActivity = events?.filter((e) => e.status === "suspicious").length || 0;

  // Build network topology from events
  const { nodes, links } = useMemo(() => {
    if (!events) return { nodes: [], links: [] };

    const nodeMap = new Map<string, NetworkNode>();
    const linkMap = new Map<string, NetworkLink>();

    events.forEach((event) => {
      // Add source node
      if (!nodeMap.has(event.sourceIp)) {
        nodeMap.set(event.sourceIp, {
          id: event.sourceIp,
          ip: event.sourceIp,
          connections: 0,
          blocked: 0,
          suspicious: 0,
          type: event.sourceIp.startsWith("192.168.") || event.sourceIp.startsWith("10.") ? "internal" : "external",
        });
      }

      // Add destination node
      if (!nodeMap.has(event.destinationIp)) {
        nodeMap.set(event.destinationIp, {
          id: event.destinationIp,
          ip: event.destinationIp,
          connections: 0,
          blocked: 0,
          suspicious: 0,
          type: event.destinationIp.startsWith("192.168.") || event.destinationIp.startsWith("10.") ? "internal" : "external",
        });
      }

      // Update node stats
      const sourceNode = nodeMap.get(event.sourceIp)!;
      sourceNode.connections++;
      if (event.status === "blocked") sourceNode.blocked++;
      if (event.status === "suspicious") sourceNode.suspicious++;

      // Create link key
      const linkKey = `${event.sourceIp}→${event.destinationIp}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, {
          source: event.sourceIp,
          target: event.destinationIp,
          count: 1,
          status: event.status,
        });
      } else {
        const link = linkMap.get(linkKey)!;
        link.count++;
        if (event.status === "blocked" || event.status === "suspicious") {
          link.status = event.status;
        }
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    };
  }, [events]);

  const filteredLinks = filterStatus
    ? links.filter((l) => l.status === (filterStatus as "allowed" | "blocked" | "suspicious"))
    : links;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Network Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Real-time network traffic and connection monitoring
        </p>
      </div>

      {/* Network Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Active Connections
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Activity className="h-4 w-4 text-status-online" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums" data-testid="stat-active-connections">
              {activeConnections}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Blocked
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums" data-testid="stat-blocked-connections">
              {blockedConnections}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Blocked attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Suspicious
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Globe className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums" data-testid="stat-suspicious-activity">
              {suspiciousActivity}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Under investigation</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Topology */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Network Topology
            </CardTitle>
            <div className="flex gap-2">
              <Badge
                variant={filterStatus === null ? "default" : "outline"}
                onClick={() => setFilterStatus(null)}
                className="cursor-pointer"
                data-testid="filter-all"
              >
                All ({filteredLinks.length})
              </Badge>
              <Badge
                variant={filterStatus === "allowed" ? "default" : "outline"}
                onClick={() => setFilterStatus("allowed")}
                className="cursor-pointer"
                data-testid="filter-allowed"
              >
                Allowed
              </Badge>
              <Badge
                variant={filterStatus === "blocked" ? "default" : "outline"}
                onClick={() => setFilterStatus("blocked")}
                className="cursor-pointer"
                data-testid="filter-blocked"
              >
                Blocked
              </Badge>
              <Badge
                variant={filterStatus === "suspicious" ? "default" : "outline"}
                onClick={() => setFilterStatus("suspicious")}
                className="cursor-pointer"
                data-testid="filter-suspicious"
              >
                Suspicious
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : nodes.length > 0 ? (
            <div className="space-y-4">
              {/* Network Graph */}
              <div className="bg-muted/30 rounded-lg border border-border p-6 min-h-96">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Network Nodes ({nodes.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover-elevate"
                          data-testid={`network-node-${node.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  node.type === "internal" ? "bg-blue-500" : "bg-yellow-500"
                                }`}
                              />
                              <code className="text-xs font-mono truncate">{node.ip}</code>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {node.connections} conn
                              </Badge>
                              {node.blocked > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {node.blocked} blocked
                                </Badge>
                              )}
                              {node.suspicious > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {node.suspicious} suspicious
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">Connections ({filteredLinks.length})</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {filteredLinks.map((link, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 p-2 text-xs font-mono rounded border border-border/50"
                            data-testid={`network-link-${idx}`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <code className="truncate text-blue-400">{link.source}</code>
                              <span className="text-muted-foreground">→</span>
                              <code className="truncate text-blue-400">{link.target}</code>
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Badge
                                variant={
                                  link.status === "blocked"
                                    ? "destructive"
                                    : link.status === "suspicious"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {link.count}x {link.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Internal Network</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">External Network</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Blocked</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No network topology data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Network Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : events && events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Time</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Source IP</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Destination IP</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Protocol</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Port</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Data</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Location</TableHead>
                    <TableHead className="font-medium uppercase tracking-wide text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} data-testid={`network-event-${event.id}`} className="hover-elevate">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-400" data-testid={`event-source-${event.id}`}>
                        {event.sourceIp}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-400" data-testid={`event-dest-${event.id}`}>
                        {event.destinationIp}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.protocol}</TableCell>
                      <TableCell className="font-mono text-xs">{event.port}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.bytesTransferred ? `${(event.bytesTransferred / 1024).toFixed(2)} KB` : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{event.geoLocation || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge 
                          variant="level" 
                          value={event.status === "blocked" ? "error" : event.status === "suspicious" ? "warning" : "info"} 
                          testId={`event-status-${event.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No network events recorded</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
