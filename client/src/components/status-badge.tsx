import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Status = "active" | "acknowledged" | "resolved";
type LogLevel = "error" | "warning" | "info" | "critical";

interface StatusBadgeProps {
  variant: "severity" | "status" | "level";
  value: Severity | Status | LogLevel;
  testId?: string;
}

const severityStyles: Record<Severity, string> = {
  critical: "bg-destructive text-destructive-foreground border-destructive",
  high: "bg-orange-600/10 text-orange-400 border-orange-600/20",
  medium: "bg-yellow-600/10 text-yellow-400 border-yellow-600/20",
  low: "bg-blue-600/10 text-blue-400 border-blue-600/20",
  info: "bg-muted text-muted-foreground border-border",
};

const statusStyles: Record<Status, string> = {
  active: "bg-destructive/10 text-destructive border-destructive/20",
  acknowledged: "bg-yellow-600/10 text-yellow-400 border-yellow-600/20",
  resolved: "bg-status-online/10 text-status-online border-status-online/20",
};

const levelStyles: Record<LogLevel, string> = {
  critical: "bg-destructive text-destructive-foreground border-destructive",
  error: "bg-orange-600/10 text-orange-400 border-orange-600/20",
  warning: "bg-yellow-600/10 text-yellow-400 border-yellow-600/20",
  info: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ variant, value, testId }: StatusBadgeProps) {
  const styles = 
    variant === "severity" ? severityStyles[value as Severity] :
    variant === "status" ? statusStyles[value as Status] :
    levelStyles[value as LogLevel];

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-medium uppercase tracking-wide border", styles)}
      data-testid={testId}
    >
      {value}
    </Badge>
  );
}
