import { StatusBadge } from "./status-badge";
import type { Log } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LogEntryProps {
  log: Log;
  index: number;
}

export function LogEntry({ log, index }: LogEntryProps) {
  return (
    <div 
      className="flex gap-4 border-b border-border py-2 font-mono text-xs hover-elevate"
      data-testid={`log-entry-${log.id}`}
    >
      <div className="w-12 text-right text-muted-foreground flex-shrink-0">
        {index + 1}
      </div>
      <div className="w-32 flex-shrink-0 text-muted-foreground" data-testid={`log-timestamp-${log.id}`}>
        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
      </div>
      <div className="w-24 flex-shrink-0">
        <StatusBadge variant="level" value={log.level as any} testId={`log-level-${log.id}`} />
      </div>
      <div className="w-28 flex-shrink-0 text-muted-foreground">
        {log.source}
      </div>
      {log.ipAddress && (
        <div className="w-36 flex-shrink-0 text-blue-400" data-testid={`log-ip-${log.id}`}>
          {log.ipAddress}
        </div>
      )}
      <div className="w-40 flex-shrink-0 text-muted-foreground">
        {log.eventType}
      </div>
      <div className="flex-1 min-w-0" data-testid={`log-message-${log.id}`}>
        {log.message}
      </div>
    </div>
  );
}
