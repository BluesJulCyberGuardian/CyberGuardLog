import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User accounts for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Log entries for security monitoring
export const logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: varchar("level", { length: 20 }).notNull(), // info, warning, error, critical
  source: varchar("source", { length: 100 }).notNull(), // application, system, network, security
  ipAddress: varchar("ip_address", { length: 45 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string for additional data
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Security alerts detected by the system
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  severity: varchar("severity", { length: 20 }).notNull(), // critical, high, medium, low, info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, acknowledged, resolved
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
  acknowledgedAt: true,
  resolvedAt: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Network events and traffic monitoring
export const networkEvents = pgTable("network_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  destinationIp: varchar("destination_ip", { length: 45 }).notNull(),
  port: integer("port"),
  protocol: varchar("protocol", { length: 20 }), // TCP, UDP, HTTP, HTTPS
  bytesTransferred: integer("bytes_transferred"),
  status: varchar("status", { length: 20 }), // allowed, blocked, suspicious
  geoLocation: varchar("geo_location", { length: 100 }), // Country/City
});

export const insertNetworkEventSchema = createInsertSchema(networkEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertNetworkEvent = z.infer<typeof insertNetworkEventSchema>;
export type NetworkEvent = typeof networkEvents.$inferSelect;

// System metrics for dashboard
export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metricType: varchar("metric_type", { length: 50 }).notNull(), // threat_count, bandwidth, active_connections, cpu_usage
  value: integer("value").notNull(),
  unit: varchar("unit", { length: 20 }), // count, mbps, percent
});

export const insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
  timestamp: true,
});

export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;

// Custom alerting rules for automated monitoring
export const alertingRules = pgTable("alerting_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  condition: text("condition").notNull(), // JSON string for rule conditions
  severity: varchar("severity", { length: 20 }).notNull(), // critical, high, medium, low
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlertingRuleSchema = createInsertSchema(alertingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAlertingRule = z.infer<typeof insertAlertingRuleSchema>;
export type AlertingRule = typeof alertingRules.$inferSelect;

// Rule condition types
export interface RuleCondition {
  type: "ip" | "eventType" | "severity" | "pattern" | "source";
  operator: "equals" | "contains" | "matches" | "in";
  value: string | string[];
}

export interface RuleEvaluationContext {
  ip?: string;
  eventType: string;
  severity: string;
  message: string;
  source: string;
}
