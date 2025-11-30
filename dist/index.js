// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: varchar("level", { length: 20 }).notNull(),
  // info, warning, error, critical
  source: varchar("source", { length: 100 }).notNull(),
  // application, system, network, security
  ipAddress: varchar("ip_address", { length: 45 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  message: text("message").notNull(),
  metadata: text("metadata")
  // JSON string for additional data
});
var insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true
});
var alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  severity: varchar("severity", { length: 20 }).notNull(),
  // critical, high, medium, low, info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // active, acknowledged, resolved
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at")
});
var insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
  acknowledgedAt: true,
  resolvedAt: true
});
var networkEvents = pgTable("network_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  destinationIp: varchar("destination_ip", { length: 45 }).notNull(),
  port: integer("port"),
  protocol: varchar("protocol", { length: 20 }),
  // TCP, UDP, HTTP, HTTPS
  bytesTransferred: integer("bytes_transferred"),
  status: varchar("status", { length: 20 }),
  // allowed, blocked, suspicious
  geoLocation: varchar("geo_location", { length: 100 })
  // Country/City
});
var insertNetworkEventSchema = createInsertSchema(networkEvents).omit({
  id: true,
  timestamp: true
});
var metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  // threat_count, bandwidth, active_connections, cpu_usage
  value: integer("value").notNull(),
  unit: varchar("unit", { length: 20 })
  // count, mbps, percent
});
var insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
  timestamp: true
});
var alertingRules = pgTable("alerting_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  condition: text("condition").notNull(),
  // JSON string for rule conditions
  severity: varchar("severity", { length: 20 }).notNull(),
  // critical, high, medium, low
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertAlertingRuleSchema = createInsertSchema(alertingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var sql2 = neon(process.env.DATABASE_URL);
var db = drizzle({ client: sql2 });

// server/storage-db.ts
import { desc, eq } from "drizzle-orm";

// server/openai.ts
import OpenAI from "openai";
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set - AI anomaly detection will be disabled");
}
var openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
async function analyzeLogForAnomalies(logMessage, logContext) {
  if (!openai) {
    return {
      isAnomalous: false,
      confidence: 0,
      analysis: "AI analysis unavailable"
    };
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a cybersecurity expert analyzing network security logs. 
Determine if the given log entry represents an anomalous or suspicious activity. 
Consider patterns like:
- Unusual IP addresses or geographical locations
- Abnormal access patterns or timing
- Suspicious authentication attempts
- Unusual data transfers
- Port scanning or network reconnaissance
- Privilege escalation attempts
- Data exfiltration indicators

Respond with JSON in this format: { "isAnomalous": boolean, "confidence": number (0-1), "analysis": "brief explanation" }`
        },
        {
          role: "user",
          content: `Log Message: ${logMessage}

Context: ${logContext}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      isAnomalous: result.isAnomalous || false,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      analysis: result.analysis || "No analysis available"
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    return {
      isAnomalous: false,
      confidence: 0,
      analysis: "AI analysis failed"
    };
  }
}

// server/storage-db.ts
var DatabaseStorage = class {
  initialized = false;
  constructor() {
    this.seedInitialData();
  }
  seedInitialData() {
    this.seedInitialDataAsync().catch((err) => console.error("Seed error:", err));
  }
  async seedInitialDataAsync() {
    if (this.initialized) return;
    try {
      const existingLogs = await this.getLogs();
      if (existingLogs.length > 0) {
        this.initialized = true;
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const sampleLogs = [
        {
          level: "info",
          source: "application",
          ipAddress: "192.168.1.105",
          eventType: "user_login",
          message: "User authentication successful",
          metadata: null
        },
        {
          level: "warning",
          source: "security",
          ipAddress: "203.0.113.42",
          eventType: "failed_login",
          message: "Failed login attempt detected from suspicious IP",
          metadata: JSON.stringify({ attempts: 3 })
        },
        {
          level: "error",
          source: "network",
          ipAddress: "198.51.100.28",
          eventType: "connection_timeout",
          message: "Connection timeout on port 8080",
          metadata: null
        },
        {
          level: "critical",
          source: "security",
          ipAddress: "192.0.2.156",
          eventType: "unauthorized_access",
          message: "Unauthorized access attempt to admin panel",
          metadata: JSON.stringify({ resource: "/admin" })
        },
        {
          level: "info",
          source: "system",
          ipAddress: null,
          eventType: "service_start",
          message: "Security monitoring service started successfully",
          metadata: null
        },
        {
          level: "warning",
          source: "network",
          ipAddress: "10.0.0.45",
          eventType: "high_bandwidth",
          message: "Unusual bandwidth spike detected",
          metadata: JSON.stringify({ bandwidth: 950 })
        }
      ];
      for (const logData of sampleLogs) {
        await this.createLog(logData);
      }
      const sampleAlerts = [
        {
          severity: "high",
          title: "Unusual Data Exfiltration",
          description: "Large volume of data transferred to external IP address",
          source: "network",
          ipAddress: "198.51.100.99",
          status: "active"
        },
        {
          severity: "low",
          title: "Certificate Expiring Soon",
          description: "SSL certificate for api.example.com expires in 7 days",
          source: "system",
          ipAddress: null,
          status: "resolved"
        }
      ];
      for (const alertData of sampleAlerts) {
        await this.createAlert(alertData);
      }
      const sampleEvents = [
        {
          sourceIp: "192.168.1.105",
          destinationIp: "93.184.216.34",
          port: 443,
          protocol: "HTTPS",
          bytesTransferred: 45678,
          status: "allowed",
          geoLocation: "United States"
        },
        {
          sourceIp: "10.0.0.15",
          destinationIp: "151.101.1.140",
          port: 80,
          protocol: "HTTP",
          bytesTransferred: 12340,
          status: "allowed",
          geoLocation: "United Kingdom"
        },
        {
          sourceIp: "203.0.113.42",
          destinationIp: "192.168.1.1",
          port: 22,
          protocol: "SSH",
          bytesTransferred: 2048,
          status: "blocked",
          geoLocation: "Russia"
        }
      ];
      for (const eventData of sampleEvents) {
        await this.createNetworkEvent(eventData);
      }
      const currentMetrics = [
        { metricType: "threat_count", value: 23, unit: "count" },
        { metricType: "active_connections", value: 142, unit: "count" },
        { metricType: "bandwidth", value: 387, unit: "mbps" },
        { metricType: "cpu_usage", value: 45, unit: "percent" }
      ];
      for (const metricData of currentMetrics) {
        await this.createMetric(metricData);
      }
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 36e5);
        const baseTraffic = 50 + Math.floor(Math.sin(i / 4) * 30);
        const baseThreats = Math.floor(Math.random() * 8) + 2;
        await this.createMetric({
          metricType: "traffic_volume",
          value: baseTraffic + Math.floor(Math.random() * 20),
          unit: "mbps"
        });
        await this.createMetric({
          metricType: "hourly_threats",
          value: baseThreats,
          unit: "count"
        });
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to seed initial data:", error);
      this.initialized = true;
    }
  }
  // Logs
  async getLogs() {
    return db.select().from(logs).orderBy(desc(logs.timestamp)).limit(1e3);
  }
  async getRecentLogs(limit) {
    return db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
  }
  async createLog(insertLog) {
    const [log2] = await db.insert(logs).values(insertLog).returning();
    this.detectAnomalies(log2).catch((err) => console.error("Anomaly detection error:", err));
    return log2;
  }
  async detectAnomalies(log2) {
    const patterns = [
      { pattern: /failed.*login|authentication.*failed/i, severity: "high" },
      { pattern: /port.*scan|scanning|reconnaissance/i, severity: "high" },
      { pattern: /ddos|flood|syn.*attack/i, severity: "critical" },
      { pattern: /privilege.*escalation|sudo|root.*access/i, severity: "critical" },
      { pattern: /data.*exfil|data.*transfer.*unusual|suspicious.*download/i, severity: "critical" },
      { pattern: /sql.*injection|injection|xss|cross.*site/i, severity: "high" },
      { pattern: /firewall.*block|blocked|denied/i, severity: "medium" }
    ];
    let alertTriggered = false;
    let detectedSeverity = "info";
    for (const { pattern, severity } of patterns) {
      if (pattern.test(log2.message) || pattern.test(log2.eventType)) {
        alertTriggered = true;
        if (severity === "critical" || severity === "high" && detectedSeverity !== "critical") {
          detectedSeverity = severity;
        }
        break;
      }
    }
    if (log2.level === "error" || log2.level === "critical") {
      const aiAnalysis = await analyzeLogForAnomalies(
        log2.message,
        `Source: ${log2.source}, Type: ${log2.eventType}, IP: ${log2.ipAddress || "N/A"}`
      );
      if (aiAnalysis.isAnomalous && aiAnalysis.confidence > 0.6) {
        alertTriggered = true;
        detectedSeverity = "critical";
      }
    }
    if (alertTriggered) {
      await this.createAlert({
        severity: detectedSeverity,
        title: `Anomaly Detected: ${log2.eventType}`,
        description: log2.message,
        source: log2.source,
        ipAddress: log2.ipAddress || null,
        status: "active"
      });
    }
  }
  // Alerts
  async getAlerts() {
    return db.select().from(alerts).orderBy(desc(alerts.timestamp));
  }
  async getAlert(id) {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }
  async createAlert(insertAlert) {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }
  async acknowledgeAlert(id) {
    const [alert] = await db.update(alerts).set({ status: "acknowledged", acknowledgedAt: /* @__PURE__ */ new Date() }).where(eq(alerts.id, id)).returning();
    return alert;
  }
  async resolveAlert(id) {
    const [alert] = await db.update(alerts).set({ status: "resolved", resolvedAt: /* @__PURE__ */ new Date() }).where(eq(alerts.id, id)).returning();
    return alert;
  }
  // Network Events
  async getNetworkEvents() {
    return db.select().from(networkEvents).orderBy(desc(networkEvents.timestamp));
  }
  async createNetworkEvent(insertEvent) {
    const [event] = await db.insert(networkEvents).values(insertEvent).returning();
    return event;
  }
  // Metrics
  async getMetrics() {
    return db.select().from(metrics).orderBy(desc(metrics.timestamp));
  }
  async createMetric(insertMetric) {
    const [metric] = await db.insert(metrics).values(insertMetric).returning();
    return metric;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/logs", async (req, res) => {
    try {
      const logs2 = await storage.getLogs();
      res.json(logs2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });
  app2.get("/api/logs/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const logs2 = await storage.getRecentLogs(limit);
      res.json(logs2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent logs" });
    }
  });
  app2.post("/api/logs", async (req, res) => {
    try {
      const validatedData = insertLogSchema.parse(req.body);
      const log2 = await storage.createLog(validatedData);
      res.status(201).json(log2);
    } catch (error) {
      res.status(400).json({ error: "Invalid log data" });
    }
  });
  app2.get("/api/alerts", async (req, res) => {
    try {
      const alerts2 = await storage.getAlerts();
      res.json(alerts2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });
  app2.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });
  app2.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const alert = await storage.acknowledgeAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });
  app2.patch("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const alert = await storage.resolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });
  app2.get("/api/network/events", async (req, res) => {
    try {
      const events = await storage.getNetworkEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network events" });
    }
  });
  app2.post("/api/network/events", async (req, res) => {
    try {
      const validatedData = insertNetworkEventSchema.parse(req.body);
      const event = await storage.createNetworkEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid network event data" });
    }
  });
  app2.get("/api/metrics", async (req, res) => {
    try {
      const metrics2 = await storage.getMetrics();
      res.json(metrics2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  app2.post("/api/metrics", async (req, res) => {
    try {
      const validatedData = insertMetricSchema.parse(req.body);
      const metric = await storage.createMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      res.status(400).json({ error: "Invalid metric data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
