import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Edit2, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AlertingRule, RuleCondition } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const ruleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  enabled: z.boolean().default(true),
  condition: z.string().min(1, "Conditions required"),
});

type RuleFormData = z.infer<typeof ruleSchema>;

export default function RulesManagement() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: rules, isLoading } = useQuery<AlertingRule[]>({
    queryKey: ["/api/rules"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Created",
        description: "Alerting rule has been created successfully.",
      });
      setIsCreating(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/rules/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Updated",
        description: "Alerting rule has been updated successfully.",
      });
      setEditingId(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Deleted",
        description: "Alerting rule has been deleted.",
      });
    },
  });

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      severity: "high",
      enabled: true,
      condition: '[]',
    },
  });

  const onSubmit = async (data: RuleFormData) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save rule",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rule: AlertingRule) => {
    setEditingId(rule.id);
    form.reset({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity as any,
      enabled: rule.enabled,
      condition: rule.condition,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Alerting Rules</h1>
        <p className="text-sm text-muted-foreground">Create and manage custom alerting rules for log analysis</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {editingId ? "Edit Rule" : "New Rule"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SSH Brute Force" {...field} data-testid="input-rule-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Rule description..." {...field} data-testid="input-rule-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-severity">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditions (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='[{"type":"eventType","operator":"contains","value":"ssh"}]'
                          {...field}
                          data-testid="input-condition"
                          className="font-mono text-xs"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Type: ip, eventType, severity, pattern, source
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1" data-testid="button-save-rule">
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {(isCreating || editingId) && (
                    <Button type="button" variant="outline" onClick={handleCancel} data-testid="button-cancel-rule">
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>

            {!isCreating && !editingId && (
              <Button
                onClick={() => setIsCreating(true)}
                className="w-full"
                data-testid="button-new-rule"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Rules ({rules?.filter(r => r.enabled).length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="space-y-2 pr-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : rules && rules.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
                      data-testid={`card-rule-${rule.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{rule.name}</h3>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            data-testid={`badge-severity-${rule.id}`}
                          >
                            {rule.severity}
                          </Badge>
                          {rule.enabled && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-enabled-${rule.id}`}>
                              Active
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {rule.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(rule)}
                          data-testid={`button-edit-rule-${rule.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(rule.id)}
                          data-testid={`button-delete-rule-${rule.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No rules created yet
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
