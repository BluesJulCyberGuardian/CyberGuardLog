import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { insertLogSchema, insertAlertSchema, insertNetworkEventSchema, insertMetricSchema, insertAlertingRuleSchema } from "@shared/schema";
import { storage } from "./storage-db";
import type { IStorage } from "./storage-db";
import { logStreamManager } from "./websocket";
import { findUserByUsername, verifyPassword, createUser, findUserByEmail, requireAuth } from "./auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user
      const user = await createUser(username, email, password);

      // Set session
      const session = req.session as any;
      session.userId = user.id;
      session.username = user.username;

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const user = await findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordMatch = await verifyPassword(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      const session = req.session as any;
      session.userId = user.id;
      session.username = user.username;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      res.status(400).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      id: session.userId,
      username: session.username,
    });
  });

  // Protected routes - require authentication
  const protectedRoutes = [
    "/api/logs",
    "/api/alerts",
    "/api/network/events",
    "/api/metrics",
    "/api/rules",
  ];

  app.use((req, res, next) => {
    if (protectedRoutes.some((route) => req.path.startsWith(route))) {
      const session = req.session as any;
      if (!session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    next();
  });

  // Log endpoints
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/logs/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent logs" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const validatedData = insertLogSchema.parse(req.body);
      const log = await storage.createLog(validatedData);
      logStreamManager.broadcastLogCreated(log);
      // Evaluate custom rules for the log
      await storage.evaluateRulesForLog(log);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid log data" });
    }
  });

  // Alert endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      logStreamManager.broadcastAlertCreated(alert);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
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

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
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

  // Network event endpoints
  app.get("/api/network/events", async (req, res) => {
    try {
      const events = await storage.getNetworkEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network events" });
    }
  });

  app.post("/api/network/events", async (req, res) => {
    try {
      const validatedData = insertNetworkEventSchema.parse(req.body);
      const event = await storage.createNetworkEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid network event data" });
    }
  });

  // Metrics endpoints
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    try {
      const validatedData = insertMetricSchema.parse(req.body);
      const metric = await storage.createMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      res.status(400).json({ error: "Invalid metric data" });
    }
  });

  // Alerting Rules endpoints
  app.get("/api/rules", async (req, res) => {
    try {
      const rules = await storage.getAlertingRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerting rules" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      const validatedData = insertAlertingRuleSchema.parse(req.body);
      const rule = await storage.createAlertingRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: "Invalid rule data" });
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    try {
      const updates = insertAlertingRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAlertingRule(req.params.id, updates);
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(400).json({ error: "Invalid rule data" });
    }
  });

  app.delete("/api/rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAlertingRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  const httpServer = createServer(app);
  logStreamManager.initialize(httpServer);
  return httpServer;
}
