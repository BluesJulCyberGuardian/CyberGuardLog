import { WebSocketServer, type WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { Log, Alert } from "@shared/schema";

interface LogSubscriber {
  ws: WebSocket;
  id: string;
}

export class LogStreamManager {
  private subscribers: Map<string, LogSubscriber> = new Map();
  private wsServer: WebSocketServer | null = null;

  initialize(server: HttpServer): void {
    this.wsServer = new WebSocketServer({ server, path: "/ws/logs" });

    this.wsServer.on("connection", (ws) => {
      const subscriberId = Math.random().toString(36).substr(2, 9);
      this.subscribers.set(subscriberId, { ws, id: subscriberId });

      ws.on("close", () => {
        this.subscribers.delete(subscriberId);
      });

      ws.on("error", (err) => {
        console.error("WebSocket error:", err);
        this.subscribers.delete(subscriberId);
      });
    });
  }

  broadcastLogCreated(log: Log): void {
    if (!this.wsServer) return;

    const message = JSON.stringify({
      type: "log_created",
      data: log,
      timestamp: new Date(),
    });

    this.subscribers.forEach(({ ws }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  broadcastAlertCreated(alert: Alert): void {
    if (!this.wsServer) return;

    const message = JSON.stringify({
      type: "alert_created",
      data: alert,
      timestamp: new Date(),
    });

    this.subscribers.forEach(({ ws }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }
}

export const logStreamManager = new LogStreamManager();
