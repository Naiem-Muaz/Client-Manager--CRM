import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  colorClass?: string;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorClass,
}: MetricCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              {trend && (
                <span className="text-sm text-muted-foreground">{trend}</span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              colorClass || "bg-primary/10"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                colorClass ? "text-white" : "text-primary"
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
