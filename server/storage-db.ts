import { db } from "./db";
import {
  type Log, logs,
  type Alert, alerts,
  type NetworkEvent, networkEvents,
  type Metric, metrics,
  type AlertingRule, alertingRules,
  type InsertLog,
  type InsertAlert,
  type InsertNetworkEvent,
  type InsertMetric,
  type InsertAlertingRule,
  type RuleCondition,
  type RuleEvaluationContext,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { analyzeLogForAnomalies } from "./openai";

export interface IStorage {
  // Logs
  getLogs(): Promise<Log[]>;
  getRecentLogs(limit: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  
  // Alerts
  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string): Promise<Alert | undefined>;
  resolveAlert(id: string): Promise<Alert | undefined>;
  
  // Network Events
  getNetworkEvents(): Promise<NetworkEvent[]>;
  createNetworkEvent(event: InsertNetworkEvent): Promise<NetworkEvent>;
  
  // Metrics
  getMetrics(): Promise<Metric[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;
  
  // Alerting Rules
  getAlertingRules(): Promise<AlertingRule[]>;
  createAlertingRule(rule: InsertAlertingRule): Promise<AlertingRule>;
  updateAlertingRule(id: string, rule: Partial<InsertAlertingRule>): Promise<AlertingRule | undefined>;
  deleteAlertingRule(id: string): Promise<boolean>;
  evaluateRulesForLog(log: Log): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  constructor() {
    // Database connection established in db.ts
    this.seedInitialData();
  }

  private seedInitialData(): void {
    // Don't await - run asynchronously to avoid blocking
    this.seedInitialDataAsync().catch(err => console.error("Seed error:", err));
  }

  private async seedInitialDataAsync(): Promise<void> {
    if (this.initialized) return;

    try {
      const existingLogs = await this.getLogs();
      if (existingLogs.length > 0) {
        this.initialized = true;
        return; // Database already seeded
      }

      const now = new Date();

      // Seed sample logs
      const sampleLogs = [
        {
          level: "info",
          source: "application",
          ipAddress: "192.168.1.105",
          eventType: "user_login",
          message: "User authentication successful",
          metadata: null,
        },
        {
          level: "warning",
          source: "security",
          ipAddress: "203.0.113.42",
          eventType: "failed_login",
          message: "Failed login attempt detected from suspicious IP",
          metadata: JSON.stringify({ attempts: 3 }),
        },
        {
          level: "error",
          source: "network",
          ipAddress: "198.51.100.28",
          eventType: "connection_timeout",
          message: "Connection timeout on port 8080",
          metadata: null,
        },
        {
          level: "critical",
          source: "security",
          ipAddress: "192.0.2.156",
          eventType: "unauthorized_access",
          message: "Unauthorized access attempt to admin panel",
          metadata: JSON.stringify({ resource: "/admin" }),
        },
        {
          level: "info",
          source: "system",
          ipAddress: null,
          eventType: "service_start",
          message: "Security monitoring service started successfully",
          metadata: null,
        },
        {
          level: "warning",
          source: "network",
          ipAddress: "10.0.0.45",
          eventType: "high_bandwidth",
          message: "Unusual bandwidth spike detected",
          metadata: JSON.stringify({ bandwidth: 950 }),
        },
      ];

      for (const logData of sampleLogs) {
        await this.createLog(logData);
      }

      // Seed manual alerts
      const sampleAlerts = [
        {
          severity: "high" as const,
          title: "Unusual Data Exfiltration",
          description: "Large volume of data transferred to external IP address",
          source: "network",
          ipAddress: "198.51.100.99",
          status: "active" as const,
        },
        {
          severity: "low" as const,
          title: "Certificate Expiring Soon",
          description: "SSL certificate for api.example.com expires in 7 days",
          source: "system",
          ipAddress: null,
          status: "resolved" as const,
        },
      ];

      for (const alertData of sampleAlerts) {
        await this.createAlert(alertData);
      }

      // Seed network events
      const sampleEvents = [
        {
          sourceIp: "192.168.1.105",
          destinationIp: "93.184.216.34",
          port: 443,
          protocol: "HTTPS",
          bytesTransferred: 45678,
          status: "allowed" as const,
          geoLocation: "United States",
        },
        {
          sourceIp: "10.0.0.15",
          destinationIp: "151.101.1.140",
          port: 80,
          protocol: "HTTP",
          bytesTransferred: 12340,
          status: "allowed" as const,
          geoLocation: "United Kingdom",
        },
        {
          sourceIp: "203.0.113.42",
          destinationIp: "192.168.1.1",
          port: 22,
          protocol: "SSH",
          bytesTransferred: 2048,
          status: "blocked" as const,
          geoLocation: "Russia",
        },
      ];

      for (const eventData of sampleEvents) {
        await this.createNetworkEvent(eventData);
      }

      // Seed metrics
      const currentMetrics = [
        { metricType: "threat_count", value: 23, unit: "count" },
        { metricType: "active_connections", value: 142, unit: "count" },
        { metricType: "bandwidth", value: 387, unit: "mbps" },
        { metricType: "cpu_usage", value: 45, unit: "percent" },
      ];

      for (const metricData of currentMetrics) {
        await this.createMetric(metricData);
      }

      // Seed historical metrics for chart
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - (i * 3600000));
        const baseTraffic = 50 + Math.floor(Math.sin(i / 4) * 30);
        const baseThreats = Math.floor(Math.random() * 8) + 2;

        await this.createMetric({
          metricType: "traffic_volume",
          value: baseTraffic + Math.floor(Math.random() * 20),
          unit: "mbps",
        });

        await this.createMetric({
          metricType: "hourly_threats",
          value: baseThreats,
          unit: "count",
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to seed initial data:", error);
      this.initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  // Logs
  async getLogs(): Promise<Log[]> {
    return db.select().from(logs).orderBy(desc(logs.timestamp)).limit(1000);
  }

  async getRecentLogs(limit: number): Promise<Log[]> {
    return db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const [log] = await db.insert(logs).values(insertLog).returning();
    
    // Trigger anomaly detection asynchronously (don't block)
    this.detectAnomalies(log).catch(err => console.error("Anomaly detection error:", err));
    
    return log;
  }

  private async detectAnomalies(log: Log): Promise<void> {
    // Pattern matching for immediate detection
    const patterns = [
      { pattern: /failed.*login|authentication.*failed/i, severity: "high" as const },
      { pattern: /port.*scan|scanning|reconnaissance/i, severity: "high" as const },
      { pattern: /ddos|flood|syn.*attack/i, severity: "critical" as const },
      { pattern: /privilege.*escalation|sudo|root.*access/i, severity: "critical" as const },
      { pattern: /data.*exfil|data.*transfer.*unusual|suspicious.*download/i, severity: "critical" as const },
      { pattern: /sql.*injection|injection|xss|cross.*site/i, severity: "high" as const },
      { pattern: /firewall.*block|blocked|denied/i, severity: "medium" as const },
    ];

    let alertTriggered = false;
    let detectedSeverity: "critical" | "high" | "medium" | "low" | "info" = "info";

    for (const { pattern, severity } of patterns) {
      if (pattern.test(log.message) || pattern.test(log.eventType)) {
        alertTriggered = true;
        if (severity === "critical" || (severity === "high" && detectedSeverity !== "critical")) {
          detectedSeverity = severity;
        }
        break;
      }
    }

    // Use AI for additional analysis if OpenAI is available
    if (log.level === "error" || log.level === "critical") {
      const aiAnalysis = await analyzeLogForAnomalies(
        log.message,
        `Source: ${log.source}, Type: ${log.eventType}, IP: ${log.ipAddress || "N/A"}`
      );
      
      if (aiAnalysis.isAnomalous && aiAnalysis.confidence > 0.6) {
        alertTriggered = true;
        detectedSeverity = "critical";
      }
    }

    if (alertTriggered) {
      await this.createAlert({
        severity: detectedSeverity,
        title: `Anomaly Detected: ${log.eventType}`,
        description: log.message,
        source: log.source,
        ipAddress: log.ipAddress || null,
        status: "active",
      });
    }
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.timestamp));
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async acknowledgeAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ status: "acknowledged", acknowledgedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  // Network Events
  async getNetworkEvents(): Promise<NetworkEvent[]> {
    return db.select().from(networkEvents).orderBy(desc(networkEvents.timestamp));
  }

  async createNetworkEvent(insertEvent: InsertNetworkEvent): Promise<NetworkEvent> {
    const [event] = await db.insert(networkEvents).values(insertEvent).returning();
    return event;
  }

  // Metrics
  async getMetrics(): Promise<Metric[]> {
    return db.select().from(metrics).orderBy(desc(metrics.timestamp));
  }

  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const [metric] = await db.insert(metrics).values(insertMetric).returning();
    return metric;
  }

  // Alerting Rules
  async getAlertingRules(): Promise<AlertingRule[]> {
    return db.select().from(alertingRules).orderBy(desc(alertingRules.createdAt));
  }

  async createAlertingRule(rule: InsertAlertingRule): Promise<AlertingRule> {
    const [newRule] = await db.insert(alertingRules).values(rule).returning();
    return newRule;
  }

  async updateAlertingRule(id: string, rule: Partial<InsertAlertingRule>): Promise<AlertingRule | undefined> {
    const [updated] = await db
      .update(alertingRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(alertingRules.id, id))
      .returning();
    return updated;
  }

  async deleteAlertingRule(id: string): Promise<boolean> {
    const result = await db.delete(alertingRules).where(eq(alertingRules.id, id));
    return !!result;
  }

  async evaluateRulesForLog(log: Log): Promise<void> {
    const rules = await this.getAlertingRules();
    const enabledRules = rules.filter(r => r.enabled);

    for (const rule of enabledRules) {
      try {
        const conditions = JSON.parse(rule.condition) as RuleCondition[];
        const context: RuleEvaluationContext = {
          ip: log.ipAddress || undefined,
          eventType: log.eventType,
          severity: log.level,
          message: log.message,
          source: log.source,
        };

        if (this.evaluateConditions(conditions, context)) {
          await this.createAlert({
            severity: rule.severity as "critical" | "high" | "medium" | "low" | "info",
            title: rule.name,
            description: `Custom rule triggered: ${rule.description || rule.name}`,
            source: log.source,
            ipAddress: log.ipAddress || null,
            status: "active",
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private evaluateConditions(conditions: RuleCondition[], context: RuleEvaluationContext): boolean {
    return conditions.every(cond => this.evaluateCondition(cond, context));
  }

  private evaluateCondition(cond: RuleCondition, context: RuleEvaluationContext): boolean {
    const getValue = (): string | undefined => {
      if (cond.type === "ip") return context.ip;
      if (cond.type === "eventType") return context.eventType;
      if (cond.type === "severity") return context.severity;
      if (cond.type === "pattern") return context.message;
      if (cond.type === "source") return context.source;
      return undefined;
    };

    const value = getValue();
    if (!value) return false;

    if (cond.operator === "equals") {
      return value === cond.value;
    } else if (cond.operator === "contains") {
      return value.includes(String(cond.value));
    } else if (cond.operator === "matches") {
      try {
        const regex = new RegExp(String(cond.value), "i");
        return regex.test(value);
      } catch {
        return false;
      }
    } else if (cond.operator === "in") {
      return Array.isArray(cond.value) && cond.value.includes(value);
    }

    return false;
  }
}

export const storage = new DatabaseStorage();
