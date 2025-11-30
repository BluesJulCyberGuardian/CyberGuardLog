import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon?: LucideIcon;
  testId?: string;
}

export function MetricCard({ title, value, unit, trend, trendValue, icon: Icon, testId }: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = 
    trend === "up" ? "text-destructive" : 
    trend === "down" ? "text-status-online" : 
    "text-muted-foreground";

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tabular-nums" data-testid={`${testId}-value`}>
            {value}
          </div>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend && trendValue && (
          <div className={`mt-2 flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
