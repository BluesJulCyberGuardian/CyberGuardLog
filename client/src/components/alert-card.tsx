import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { Alert } from "@shared/schema";
import { format } from "date-fns";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
  const Icon = 
    alert.severity === "critical" || alert.severity === "high" ? AlertTriangle :
    alert.severity === "medium" || alert.severity === "low" ? Info :
    CheckCircle;

  return (
    <Card data-testid={`alert-card-${alert.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge variant="severity" value={alert.severity as any} testId={`badge-severity-${alert.id}`} />
              <StatusBadge variant="status" value={alert.status as any} testId={`badge-status-${alert.id}`} />
            </div>
            <h3 className="text-sm font-semibold mb-1" data-testid={`text-title-${alert.id}`}>{alert.title}</h3>
            <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
              <span data-testid={`text-timestamp-${alert.id}`}>{format(new Date(alert.timestamp), "MMM dd, HH:mm:ss")}</span>
              {alert.ipAddress && <span data-testid={`text-ip-${alert.id}`}>IP: {alert.ipAddress}</span>}
              <span>Source: {alert.source}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        {alert.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAcknowledge?.(alert.id)}
            data-testid={`button-acknowledge-${alert.id}`}
          >
            Acknowledge
          </Button>
        )}
        {(alert.status === "active" || alert.status === "acknowledged") && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onResolve?.(alert.id)}
            data-testid={`button-resolve-${alert.id}`}
          >
            Resolve
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
