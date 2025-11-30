import { useEffect, useState, useCallback } from "react";
import type { Log, Alert } from "@shared/schema";

interface LogStreamMessage {
  type: "log_created" | "alert_created";
  data: Log | Alert;
  timestamp: string;
}

export function useLogStream(onLogCreated?: (log: Log) => void, onAlertCreated?: (alert: Alert) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    try {
      // Safely construct WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Handle cases where window.location.host might be incomplete
      let host = window.location.host;
      if (!host || host.includes("undefined")) {
        // Fallback: use hostname and default port
        const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
        host = `${window.location.hostname}:${port}`;
      }
      
      const url = `${protocol}//${host}/ws/logs`;
      
      // Validate URL format before creating WebSocket
      try {
        new URL(url);
      } catch {
        console.warn("Invalid WebSocket URL constructed:", url);
        setIsConnected(false);
        return;
      }
      
      const websocket = new WebSocket(url);

      websocket.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message: LogStreamMessage = JSON.parse(event.data);
          
          if (message.type === "log_created" && onLogCreated) {
            onLogCreated(message.data as Log);
          } else if (message.type === "alert_created" && onAlertCreated) {
            onAlertCreated(message.data as Alert);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      websocket.onerror = (event) => {
        setIsConnected(false);
        setError("WebSocket connection error");
      };

      websocket.onclose = () => {
        setIsConnected(false);
        // Attempt reconnection after 3 seconds
        setTimeout(() => {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          let host = window.location.host;
          if (!host || host.includes("undefined")) {
            const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
            host = `${window.location.hostname}:${port}`;
          }
          const url = `${protocol}//${host}/ws/logs`;
          try {
            new URL(url);
            const newWs = new WebSocket(url);
            setWs(newWs);
          } catch {
            console.warn("Invalid WebSocket URL on reconnect:", url);
          }
        }, 3000);
      };

      setWs(websocket);

      return () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.close();
        }
      };
    } catch (err) {
      setError("Failed to establish WebSocket connection");
      console.error("WebSocket error:", err);
      setIsConnected(false);
    }
  }, [onLogCreated, onAlertCreated]);

  return { isConnected, error, ws };
}
