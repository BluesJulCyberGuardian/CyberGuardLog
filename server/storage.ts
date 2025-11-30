import { 
  type Log, type InsertLog,
  type Alert, type InsertAlert,
  type NetworkEvent, type InsertNetworkEvent,
  type Metric, type InsertMetric
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private logs: Map<string, Log>;
  private alerts: Map<string, Alert>;
  private networkEvents: Map<string, NetworkEvent>;
  private metrics: Map<string, Metric>;

  constructor() {
    this.logs = new Map();
    this.alerts = new Map();
    this.networkEvents = new Map();
    this.metrics = new Map();
    
    // Seed initial data synchronously
    this.seedData();
  }

  // Logs
  async getLogs(): Promise<Log[]> {
    return Array.from(this.logs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getRecentLogs(limit: number): Promise<Log[]> {
    const allLogs = await this.getLogs();
    return allLogs.slice(0, limit);
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = randomUUID();
    const log: Log = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.logs.set(id, log);
    
    // Check for anomalies
    this.detectAnomalies(log);
    
    return log;
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      timestamp: new Date(),
      acknowledgedAt: null,
      resolvedAt: null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async acknowledgeAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    alert.status = "acknowledged";
    alert.acknowledgedAt = new Date();
    this.alerts.set(id, alert);
    return alert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    alert.status = "resolved";
    alert.resolvedAt = new Date();
    this.alerts.set(id, alert);
    return alert;
  }

  // Network Events
  async getNetworkEvents(): Promise<NetworkEvent[]> {
    return Array.from(this.networkEvents.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createNetworkEvent(insertEvent: InsertNetworkEvent): Promise<NetworkEvent> {
    const id = randomUUID();
    const event: NetworkEvent = {
      ...insertEvent,
      id,
      timestamp: new Date(),
    };
    this.networkEvents.set(id, event);
    return event;
  }

  // Metrics
  async getMetrics(): Promise<Metric[]> {
    return Array.from(this.metrics.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const id = randomUUID();
    const metric: Metric = {
      ...insertMetric,
      id,
      timestamp: new Date(),
    };
    this.metrics.set(id, metric);
    return metric;
  }

  // Anomaly Detection - Pattern matching for suspicious activities
  private detectAnomalies(log: Log): void {
    const suspiciousPatterns = [
      { pattern: /failed.*login/i, severity: "high", title: "Multiple Failed Login Attempts" },
      { pattern: /unauthorized.*access/i, severity: "critical", title: "Unauthorized Access Attempt" },
      { pattern: /sql.*injection/i, severity: "critical", title: "SQL Injection Attempt Detected" },
      { pattern: /ddos|denial.*service/i, severity: "high", title: "Potential DDoS Attack" },
      { pattern: /malware|virus/i, severity: "critical", title: "Malware Detection" },
      { pattern: /brute.*force/i, severity: "high", title: "Brute Force Attack Detected" },
      { pattern: /port.*scan/i, severity: "medium", title: "Port Scanning Activity" },
    ];

    for (const { pattern, severity, title } of suspiciousPatterns) {
      if (pattern.test(log.message) || pattern.test(log.eventType)) {
        this.createAlert({
          severity: severity as "critical" | "high" | "medium" | "low" | "info",
          title,
          description: `Detected in log: ${log.message.substring(0, 100)}...`,
          source: log.source,
          ipAddress: log.ipAddress || undefined,
          status: "active",
        });
        break;
      }
    }
  }

  // Seed initial data
  private seedData(): void {
    const now = new Date();
    
    // Seed logs - insert directly then trigger anomaly detection
    const sampleLogs: InsertLog[] = [
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

    // Insert logs and trigger anomaly detection
    sampleLogs.forEach((logData, i) => {
      const id = randomUUID();
      const timestamp = new Date(now.getTime() - (i * 60000));
      const log: Log = { ...logData, id, timestamp };
      this.logs.set(id, log);
      
      // Manually trigger anomaly detection
      this.detectAnomalies(log);
    });

    // Additional manual alerts (non-overlapping with anomaly detection)
    const sampleAlerts: InsertAlert[] = [
      {
        severity: "high",
        title: "Unusual Data Exfiltration",
        description: "Large volume of data transferred to external IP address",
        source: "network",
        ipAddress: "198.51.100.99",
        status: "active",
      },
      {
        severity: "low",
        title: "Certificate Expiring Soon",
        description: "SSL certificate for api.example.com expires in 7 days",
        source: "system",
        ipAddress: null,
        status: "resolved",
      },
    ];

    sampleAlerts.forEach((alertData, i) => {
      const id = randomUUID();
      const timestamp = new Date(now.getTime() - ((sampleLogs.length + i) * 60000));
      const alert: Alert = {
        ...alertData,
        id,
        timestamp,
        acknowledgedAt: alertData.status === "acknowledged" || alertData.status === "resolved" ? new Date(timestamp.getTime() + 60000) : null,
        resolvedAt: alertData.status === "resolved" ? new Date(timestamp.getTime() + 180000) : null,
      };
      this.alerts.set(id, alert);
    });

    // Seed network events
    const sampleEvents: InsertNetworkEvent[] = [
      {
        sourceIp: "192.168.1.105",
        destinationIp: "93.184.216.34",
        port: 443,
        protocol: "HTTPS",
        bytesTransferred: 45678,
        status: "allowed",
        geoLocation: "United States",
      },
      {
        sourceIp: "10.0.0.15",
        destinationIp: "151.101.1.140",
        port: 80,
        protocol: "HTTP",
        bytesTransferred: 12340,
        status: "allowed",
        geoLocation: "United Kingdom",
      },
      {
        sourceIp: "203.0.113.42",
        destinationIp: "192.168.1.1",
        port: 22,
        protocol: "SSH",
        bytesTransferred: 2048,
        status: "blocked",
        geoLocation: "Russia",
      },
      {
        sourceIp: "198.51.100.28",
        destinationIp: "192.168.1.50",
        port: 3389,
        protocol: "RDP",
        bytesTransferred: 8192,
        status: "suspicious",
        geoLocation: "China",
      },
    ];

    sampleEvents.forEach((event, i) => {
      const id = randomUUID();
      const timestamp = new Date(now.getTime() - (i * 30000)); // Stagger by 30 seconds
      this.networkEvents.set(id, { ...event, id, timestamp });
    });

    // Seed current metrics for cards
    const currentMetrics = [
      { metricType: "threat_count", value: 23, unit: "count" },
      { metricType: "active_connections", value: 142, unit: "count" },
      { metricType: "bandwidth", value: 387, unit: "mbps" },
      { metricType: "cpu_usage", value: 45, unit: "percent" },
    ];

    currentMetrics.forEach((metric) => {
      const id = randomUUID();
      this.metrics.set(id, { ...metric, id, timestamp: now });
    });

    // Seed historical traffic metrics for chart (last 24 hours)
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 3600000)); // Each hour
      const baseTraffic = 50 + Math.floor(Math.sin(i / 4) * 30); // Sinusoidal pattern
      const baseThreats = Math.floor(Math.random() * 8) + 2;
      
      // Traffic metric
      const trafficId = randomUUID();
      this.metrics.set(trafficId, {
        id: trafficId,
        timestamp: hour,
        metricType: "traffic_volume",
        value: baseTraffic + Math.floor(Math.random() * 20),
        unit: "mbps",
      });
      
      // Threat metric
      const threatId = randomUUID();
      this.metrics.set(threatId, {
        id: threatId,
        timestamp: hour,
        metricType: "hourly_threats",
        value: baseThreats,
        unit: "count",
      });
    }
  }
}

export const storage = new MemStorage();
