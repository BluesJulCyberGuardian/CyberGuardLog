import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  activeFilters?: string[];
  onRemoveFilter?: (filter: string) => void;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  onRemoveFilter,
}: SearchFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search logs, alerts, or events..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        {filters?.map((filter) => (
          <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="w-40" data-testid={`select-${filter.label.toLowerCase()}`}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {activeFilters && activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter}
              variant="secondary"
              className="gap-1"
              data-testid={`filter-badge-${filter}`}
            >
              {filter}
              <button
                onClick={() => onRemoveFilter?.(filter)}
                className="ml-1 hover-elevate rounded-full"
                data-testid={`button-remove-filter-${filter}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
