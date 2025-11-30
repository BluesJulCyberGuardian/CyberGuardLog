# CyberGuard Security Platform - Complete Code Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CYBERGUARD PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (React + TypeScript)                              │
│  ├─ App.tsx          [Main entry point, routing]            │
│  ├─ pages/           [Dashboard, Logs, Alerts, etc]         │
│  └─ hooks/           [useAuth, useLogStream, etc]           │
│                                                              │
│  API GATEWAY (HTTP/WebSocket)                               │
│  ├─ /api/auth        [Login, Register, Logout]              │
│  ├─ /api/logs        [Log entries CRUD]                     │
│  ├─ /api/alerts      [Alerts CRUD]                          │
│  ├─ /api/metrics     [System metrics]                       │
│  ├─ /api/network     [Network events]                       │
│  ├─ /api/rules       [Alerting rules]                       │
│  └─ /ws/logs         [WebSocket real-time updates]          │
│                                                              │
│  BACKEND (Express + TypeScript)                             │
│  ├─ routes.ts        [API endpoint handlers]                │
│  ├─ storage-db.ts    [Database operations]                  │
│  ├─ auth.ts          [Authentication & authorization]       │
│  ├─ websocket.ts     [Real-time updates]                    │
│  └─ db.ts            [Database connection]                  │
│                                                              │
│  DATABASE (PostgreSQL)                                      │
│  ├─ users            [User accounts]                        │
│  ├─ logs             [Security event logs]                  │
│  ├─ alerts           [Security alerts]                      │
│  ├─ metrics          [System metrics]                       │
│  ├─ network_events   [Network traffic events]               │
│  └─ alerting_rules   [Custom alerting rules]                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. DATA MODELS (shared/schema.ts)

```typescript
// PSEUDOCODE: Database schema definitions using Drizzle ORM
// Each model represents a table in PostgreSQL
// Each model includes:
//   - Column definitions with types and constraints
//   - Insert schema for validation (using drizzle-zod)
//   - Type definitions for TypeScript

// TABLE: users
// PURPOSE: Store user accounts and authentication credentials
// FIELDS:
//   - id: UUID (auto-generated)
//   - username: unique identifier for login
//   - email: unique email address
//   - passwordHash: bcryptjs hashed password (never store plaintext)
//   - createdAt: account creation timestamp

// TABLE: logs
// PURPOSE: Store security event logs from all sources
// FIELDS:
//   - id: UUID (auto-generated)
//   - timestamp: when the event occurred
//   - level: severity (info, warning, error, critical)
//   - source: where the event came from (application, system, network, security)
//   - ipAddress: IP address involved in the event
//   - eventType: type of security event
//   - message: detailed description
//   - metadata: JSON string for additional data

// TABLE: alerts
// PURPOSE: Track security alerts and their lifecycle
// FIELDS:
//   - id: UUID (auto-generated)
//   - timestamp: when alert was created
//   - severity: critical, high, medium, low, info
//   - title: alert summary
//   - description: detailed explanation
//   - source: where the alert originated
//   - ipAddress: associated IP address
//   - status: active, acknowledged, resolved
//   - acknowledgedAt: when security team acknowledged it
//   - resolvedAt: when the threat was resolved

// TABLE: networkEvents
// PURPOSE: Monitor network traffic and connections
// FIELDS:
//   - id: UUID (auto-generated)
//   - timestamp: when connection occurred
//   - sourceIp: originating IP
//   - destinationIp: target IP
//   - port: destination port
//   - protocol: TCP, UDP, HTTP, HTTPS
//   - bytesTransferred: data volume
//   - status: allowed, blocked, suspicious
//   - geoLocation: geographic location of IP

// TABLE: metrics
// PURPOSE: Store time-series metrics for dashboards and charts
// FIELDS:
//   - id: UUID (auto-generated)
//   - timestamp: when metric was recorded
//   - metricType: threat_count, bandwidth, active_connections, cpu_usage, etc.
//   - value: numeric value of the metric
//   - unit: count, mbps, percent

// TABLE: alertingRules
// PURPOSE: Custom rules that auto-generate alerts
// FIELDS:
//   - id: UUID (auto-generated)
//   - name: rule name
//   - description: what the rule detects
//   - condition: JSON string defining the rule logic
//   - severity: alert severity if rule matches
//   - enabled: whether rule is active
//   - createdAt: when rule was created
//   - updatedAt: last modification time
```

---

## 2. AUTHENTICATION & AUTHORIZATION (server/auth.ts)

```typescript
// PSEUDOCODE: Secure user authentication system

// FUNCTION: hashPassword(password: string) -> hashedPassword
//   PURPOSE: Convert plaintext password to bcryptjs hash
//   ALGORITHM:
//     1. Use SALT_ROUNDS = 10 (security vs speed tradeoff)
//     2. Apply bcryptjs.hash() to generate salted hash
//     3. Return hash (store in database, never original password)
//   SECURITY: Each password gets unique salt, preventing rainbow table attacks

// FUNCTION: verifyPassword(password: string, hash: string) -> boolean
//   PURPOSE: Check if entered password matches stored hash
//   ALGORITHM:
//     1. Use bcryptjs.compare(password, hash)
//     2. Returns true if password matches, false otherwise
//   SECURITY: Time-constant comparison prevents timing attacks

// FUNCTION: findUserByUsername(username: string) -> User | undefined
//   PURPOSE: Look up user by username
//   DATABASE QUERY: SELECT * FROM users WHERE username = ?
//   RETURNS: User object or undefined if not found

// FUNCTION: findUserByEmail(email: string) -> User | undefined
//   PURPOSE: Look up user by email address
//   DATABASE QUERY: SELECT * FROM users WHERE email = ?
//   RETURNS: User object or undefined if not found

// FUNCTION: createUser(username, email, password) -> User
//   PURPOSE: Register new user account
//   ALGORITHM:
//     1. Hash the password using hashPassword()
//     2. INSERT into users table with username, email, passwordHash
//     3. Return created user object
//   VALIDATION: Done at API level before calling this function

// FUNCTION: requireAuth(req, res, next) -> void
//   PURPOSE: Middleware that protects routes requiring login
//   ALGORITHM:
//     1. Check if req.session.userId exists
//     2. If not authenticated -> respond with 401 Unauthorized
//     3. If authenticated -> call next() to continue
//   USAGE: Applied to /api/logs, /api/alerts, /api/metrics, etc.

// SESSION MANAGEMENT:
//   MIDDLEWARE: express-session with MemoryStore
//   COOKIE: Secure, HttpOnly, 24-hour expiration
//   STORAGE: In-memory (lost on server restart, not persistent)
```

---

## 3. BACKEND SERVER (server/app.ts)

```typescript
// PSEUDOCODE: Express.js server initialization and configuration

// SETUP: Express middleware pipeline
//   1. Parse JSON request bodies
//   2. Parse form data
//   3. Setup session middleware with MemoryStore
//   4. Logging middleware to track API calls

// LOGGING MIDDLEWARE:
//   PURPOSE: Log all API calls with timing and response data
//   ALGORITHM:
//     1. Record start time
//     2. Intercept res.json() to capture response
//     3. On response finish, log: METHOD PATH STATUS DURATION
//     4. Include first 79 chars of response data
//   EXAMPLE OUTPUT: "GET /api/metrics 200 in 58ms :: [{"id":"abc","value":23}…"

// SESSION CONFIGURATION:
//   STORE: MemoryStore (in-memory, good for development/small deployments)
//   CHECK PERIOD: 24 hours (cleanup expired sessions)
//   SECRET: From SESSION_SECRET env var
//   COOKIE:
//     - Secure: true in production
//     - HttpOnly: true (prevent JS access)
//     - MaxAge: 24 hours
//     - SameSite: lax (CSRF protection)

// ERROR HANDLING:
//   Catch-all middleware to handle uncaught errors
//   Respond with error status and message JSON

// SERVER STARTUP:
//   ALGORITHM:
//     1. Register all routes
//     2. Setup Vite dev server (in development)
//     3. Listen on PORT (default 5000)
//     4. Bind to 0.0.0.0 to accept external connections
```

---

## 4. API ROUTES & HANDLERS (server/routes.ts)

```typescript
// PSEUDOCODE: REST API endpoints for CyberGuard platform

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

// POST /api/auth/register
//   REQUEST: { username, email, password }
//   ALGORITHM:
//     1. Validate input with Zod schema
//     2. Check if username already exists
//     3. Check if email already exists
//     4. Create new user with hashed password
//     5. Set session (automatic login)
//     6. RESPOND: 201 Created with user data
//   ERROR CODES: 400 if validation fails, duplicate user/email

// POST /api/auth/login
//   REQUEST: { username, password }
//   ALGORITHM:
//     1. Validate input
//     2. Find user by username
//     3. Verify password matches hash
//     4. Set session with userId
//     5. RESPOND: 200 OK with user data
//   ERROR CODES: 401 if credentials invalid

// POST /api/auth/logout
//   ALGORITHM:
//     1. Destroy session
//     2. Clear cookies
//     3. RESPOND: 200 OK
//   ERROR CODES: 500 if session destroy fails

// GET /api/auth/me
//   ALGORITHM:
//     1. Check if session exists
//     2. RESPOND: 200 with { id, username }
//   ERROR CODES: 401 if not authenticated

// =============================================================================
// PROTECTED ROUTES MIDDLEWARE
// =============================================================================

// All routes starting with these prefixes require authentication:
//   - /api/logs
//   - /api/alerts
//   - /api/network/events
//   - /api/metrics
//   - /api/rules
//
// ALGORITHM:
//   1. Check if req.path starts with protected prefix
//   2. Verify req.session.userId exists
//   3. If not authenticated -> 401 Unauthorized
//   4. If authenticated -> proceed to next handler

// =============================================================================
// LOG ENDPOINTS
// =============================================================================

// GET /api/logs
//   PURPOSE: Retrieve all logs
//   ALGORITHM:
//     1. Query all logs from storage, sorted by timestamp desc
//     2. Return up to 1000 most recent logs
//   RETURNS: [Log, Log, ...] array

// GET /api/logs/recent
//   PURPOSE: Get recent logs with limit parameter
//   QUERY PARAMS: ?limit=20 (default)
//   ALGORITHM:
//     1. Parse limit from query string
//     2. Query storage for recent logs with limit
//     3. RESPOND: JSON array

// POST /api/logs
//   REQUEST: { level, source, ipAddress, eventType, message, metadata }
//   ALGORITHM:
//     1. Validate input with Zod
//     2. Insert log into database
//     3. Trigger anomaly detection (async)
//     4. Broadcast to WebSocket subscribers
//     5. Evaluate custom alerting rules
//     6. RESPOND: 201 Created with log data

// =============================================================================
// ALERT ENDPOINTS
// =============================================================================

// GET /api/alerts
//   PURPOSE: Get all alerts
//   ALGORITHM:
//     1. Query all alerts from storage, sorted by timestamp desc
//     2. RESPOND: JSON array

// POST /api/alerts
//   REQUEST: { severity, title, description, source, ipAddress, status }
//   ALGORITHM:
//     1. Validate input
//     2. Insert alert into database
//     3. Broadcast to WebSocket subscribers
//     4. RESPOND: 201 Created

// PATCH /api/alerts/{id}/acknowledge
//   PURPOSE: Mark alert as acknowledged by security team
//   ALGORITHM:
//     1. Update alert status to "acknowledged"
//     2. Set acknowledgedAt timestamp
//     3. RESPOND: 200 with updated alert

// PATCH /api/alerts/{id}/resolve
//   PURPOSE: Mark alert as resolved
//   ALGORITHM:
//     1. Update alert status to "resolved"
//     2. Set resolvedAt timestamp
//     3. RESPOND: 200 with updated alert

// =============================================================================
// NETWORK EVENT ENDPOINTS
// =============================================================================

// GET /api/network/events
//   PURPOSE: Get all network events
//   ALGORITHM:
//     1. Query network events from storage
//     2. Sort by timestamp descending
//     3. RESPOND: JSON array

// POST /api/network/events
//   REQUEST: { sourceIp, destinationIp, port, protocol, bytesTransferred, status }
//   ALGORITHM:
//     1. Validate input
//     2. Insert network event
//     3. RESPOND: 201 Created

// =============================================================================
// METRICS ENDPOINTS
// =============================================================================

// GET /api/metrics
//   PURPOSE: Get all metrics for dashboard
//   ALGORITHM:
//     1. Query metrics from storage
//     2. Sort by timestamp descending
//     3. RESPOND: JSON array (used for charts and cards)

// POST /api/metrics
//   REQUEST: { metricType, value, unit }
//   ALGORITHM:
//     1. Validate input
//     2. Insert metric into database
//     3. RESPOND: 201 Created

// =============================================================================
// ALERTING RULES ENDPOINTS
// =============================================================================

// GET /api/rules
//   PURPOSE: Get all custom alerting rules
//   ALGORITHM:
//     1. Query rules from storage
//     2. RESPOND: JSON array

// POST /api/rules
//   REQUEST: { name, description, condition, severity, enabled }
//   ALGORITHM:
//     1. Validate input
//     2. Insert rule into database
//     3. RESPOND: 201 Created

// PATCH /api/rules/{id}
//   PURPOSE: Update existing rule
//   ALGORITHM:
//     1. Validate partial input
//     2. Update rule in database
//     3. RESPOND: 200 with updated rule

// DELETE /api/rules/{id}
//   PURPOSE: Delete alerting rule
//   ALGORITHM:
//     1. Delete rule by ID
//     2. RESPOND: 200 with success

// =============================================================================
// HTTP SERVER SETUP
// =============================================================================

// ALGORITHM:
//   1. Create HTTP server wrapping Express app
//   2. Initialize WebSocket server on the HTTP server
//   3. Return server instance to be started on port 5000
```

---

## 5. DATABASE STORAGE (server/storage-db.ts)

```typescript
// PSEUDOCODE: Database abstraction layer for all CRUD operations

class DatabaseStorage implements IStorage {
  // INITIALIZATION & SEEDING
  
  // CONSTRUCTOR + seedInitialData():
  //   PURPOSE: Populate database with sample data on first run
  //   ALGORITHM:
  //     1. Check if database already has logs
  //     2. If seeded before, skip (don't duplicate)
  //     3. If empty:
  //        a. Create 6 sample logs (user_login, failed_login, unauthorized_access, etc.)
  //        b. Create 2 sample alerts (data exfiltration, certificate expiring)
  //        c. Create 3 network events (allowed, blocked, suspicious)
  //        d. Create 4 current metrics (threat_count, bandwidth, connections, cpu)
  //        e. Create 48 historical metrics (24 hours of traffic & threat data)

  // ==========================================================================
  // LOG OPERATIONS
  // ==========================================================================

  // FUNCTION: getLogs() -> Log[]
  //   SQL: SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1000
  //   RETURNS: Array of all logs (most recent first)

  // FUNCTION: getRecentLogs(limit) -> Log[]
  //   SQL: SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?
  //   RETURNS: Array of recent logs with specified limit

  // FUNCTION: createLog(logData) -> Log
  //   ALGORITHM:
  //     1. INSERT log into database
  //     2. Trigger detectAnomalies() asynchronously (non-blocking)
  //     3. RETURN created log
  //   NOTE: Anomaly detection runs in background, doesn't delay response

  // FUNCTION: detectAnomalies(log) -> void
  //   PURPOSE: Analyze log for suspicious patterns
  //   ALGORITHM:
  //     1. Check against pattern regexes:
  //        - Failed login patterns -> severity: high
  //        - Port scan patterns -> severity: high
  //        - DDoS patterns -> severity: critical
  //        - Privilege escalation -> severity: critical
  //        - Data exfiltration -> severity: critical
  //        - SQL injection patterns -> severity: high
  //        - Firewall blocks -> severity: medium
  //
  //     2. If error/critical log, call OpenAI API for AI analysis:
  //        - Send log message + metadata to OpenAI
  //        - Get confidence score
  //        - If confidence > 0.6 and anomalous -> create critical alert
  //
  //     3. If pattern matched or AI detected anomaly:
  //        - Create alert with appropriate severity
  //        - Alert status: "active"

  // ==========================================================================
  // ALERT OPERATIONS
  // ==========================================================================

  // FUNCTION: getAlerts() -> Alert[]
  //   SQL: SELECT * FROM alerts ORDER BY timestamp DESC
  //   RETURNS: All alerts sorted by newest first

  // FUNCTION: getAlert(id) -> Alert | undefined
  //   SQL: SELECT * FROM alerts WHERE id = ?
  //   RETURNS: Single alert or undefined if not found

  // FUNCTION: createAlert(alertData) -> Alert
  //   SQL: INSERT INTO alerts (...) VALUES (...)
  //   RETURNS: Created alert with auto-generated ID

  // FUNCTION: acknowledgeAlert(id) -> Alert | undefined
  //   ALGORITHM:
  //     1. UPDATE alert SET status='acknowledged', acknowledgedAt=NOW()
  //     2. RETURN updated alert
  //   PURPOSE: Security team marks alert as seen

  // FUNCTION: resolveAlert(id) -> Alert | undefined
  //   ALGORITHM:
  //     1. UPDATE alert SET status='resolved', resolvedAt=NOW()
  //     2. RETURN updated alert
  //   PURPOSE: Security team marks threat as resolved

  // ==========================================================================
  // NETWORK EVENT OPERATIONS
  // ==========================================================================

  // FUNCTION: getNetworkEvents() -> NetworkEvent[]
  //   SQL: SELECT * FROM network_events ORDER BY timestamp DESC
  //   RETURNS: All network events sorted by newest first

  // FUNCTION: createNetworkEvent(eventData) -> NetworkEvent
  //   SQL: INSERT INTO network_events (...) VALUES (...)
  //   RETURNS: Created network event

  // ==========================================================================
  // METRICS OPERATIONS
  // ==========================================================================

  // FUNCTION: getMetrics() -> Metric[]
  //   SQL: SELECT * FROM metrics ORDER BY timestamp DESC
  //   RETURNS: All metrics for dashboard charts

  // FUNCTION: createMetric(metricData) -> Metric
  //   SQL: INSERT INTO metrics (...) VALUES (...)
  //   RETURNS: Created metric

  // ==========================================================================
  // ALERTING RULES OPERATIONS
  // ==========================================================================

  // FUNCTION: getAlertingRules() -> AlertingRule[]
  //   SQL: SELECT * FROM alerting_rules ORDER BY createdAt DESC
  //   RETURNS: All rules

  // FUNCTION: createAlertingRule(ruleData) -> AlertingRule
  //   SQL: INSERT INTO alerting_rules (...) VALUES (...)
  //   RETURNS: Created rule

  // FUNCTION: updateAlertingRule(id, updates) -> AlertingRule | undefined
  //   SQL: UPDATE alerting_rules SET ... WHERE id = ?
  //   RETURNS: Updated rule or undefined if not found

  // FUNCTION: deleteAlertingRule(id) -> boolean
  //   SQL: DELETE FROM alerting_rules WHERE id = ?
  //   RETURNS: true if deleted, false if not found

  // FUNCTION: evaluateRulesForLog(log) -> void
  //   PURPOSE: Check if log matches any custom alerting rules
  //   ALGORITHM:
  //     1. Get all enabled rules from database
  //     2. For each rule:
  //        a. Parse rule.condition (JSON)
  //        b. Check if log matches conditions
  //        c. If match -> create alert with rule's severity
}
```

---

## 6. FRONTEND APP STRUCTURE (client/src/App.tsx)

```typescript
// PSEUDOCODE: Main React application entry point

// FUNCTION: Router()
//   PURPOSE: Define all application routes
//   ALGORITHM:
//     1. Use wouter <Switch> for client-side routing
//     2. Define routes:
//        - "/" -> Dashboard (home)
//        - "/logs" -> Log Analysis page
//        - "/alerts" -> Alert Management page
//        - "/network" -> Network Monitor page
//        - "/rules" -> Rules Management page
//        - "*" -> NotFound (404)

// FUNCTION: AppLayout()
//   PURPOSE: Layout wrapper with sidebar navigation
//   ALGORITHM:
//     1. Get current user from useAuth hook
//     2. Setup sidebar with width 16rem
//     3. Layout structure:
//        Header: Sidebar toggle + Username + Status + Last update time
//        Main: Router component (page content)
//     4. Sidebar provides navigation between pages

// FUNCTION: AuthenticatedApp()
//   PURPOSE: Check authentication status before rendering
//   ALGORITHM:
//     1. Call useAuth() to get authentication state
//     2. If checking auth -> show Skeleton loader
//     3. If not authenticated -> show LoginPage
//     4. If authenticated -> show AppLayout with pages
//   FLOW: Not logged in -> see LoginPage -> login -> see Dashboard

// FUNCTION: App()
//   PURPOSE: Root component with providers
//   ALGORITHM:
//     1. Wrap with QueryClientProvider (TanStack Query)
//     2. Render AuthenticatedApp
//     3. Include Toaster for notifications
//   PROVIDERS:
//     - QueryClientProvider: Manages server state (caching, fetching)
//     - TooltipProvider: Enables tooltip functionality
//     - Toaster: Toast notification system
```

---

## 7. LOGIN PAGE (client/src/pages/login.tsx)

```typescript
// PSEUDOCODE: User authentication UI

// COMPONENT: LoginPage
//   PURPOSE: Allow users to login or register
//   STATE:
//     - isRegister: boolean (toggle between login/register forms)
//     - username: string
//     - email: string (only for register)
//     - password: string
//     - showPassword: boolean (show/hide password)

// FUNCTION: handleSubmit(event)
//   ALGORITHM:
//     1. If isRegister = true:
//        a. Validate all fields filled
//        b. Call registerMutation.mutate({ username, email, password })
//        c. On success: Call onLoginSuccess() -> reload page
//        d. On error: Show toast with error message
//
//     2. If isRegister = false:
//        a. Validate username and password filled
//        b. Call loginMutation.mutate({ username, password })
//        c. On success: Call onLoginSuccess() -> reload page
//        d. On error: Show toast "Invalid credentials"

// MUTATIONS:
//   loginMutation:
//     - Sends: POST /api/auth/login { username, password }
//     - Sets: Session cookie automatically
//     - Response: { id, username, email }
//
//   registerMutation:
//     - Sends: POST /api/auth/register { username, email, password }
//     - Creates: New user account
//     - Sets: Session cookie automatically
//     - Response: { id, username, email }

// UI ELEMENTS:
//   - CyberGuard logo + title
//   - Username input
//   - Email input (register only)
//   - Password input with show/hide toggle (eye icon)
//   - Submit button (enabled while not loading)
//   - Toggle mode button (Switch between login/register)
```

---

## 8. DASHBOARD PAGE (client/src/pages/dashboard.tsx)

```typescript
// PSEUDOCODE: Main security monitoring dashboard

// COMPONENT: Dashboard
//   PURPOSE: Display real-time security metrics, alerts, and logs
//   QUERIES:
//     - GET /api/metrics -> metrics array
//     - GET /api/alerts -> alerts array
//     - GET /api/logs/recent -> logs array
//
//   WEBSOCKET:
//     - useLogStream hook establishes WebSocket connection
//     - Listens for log_created and alert_created events
//     - Invalidates React Query cache to refresh data

// FUNCTION: Calculate Metrics
//   threatCount = sum of all "threat_count" metrics
//   activeConnections = value of "active_connections" metric
//   bandwidth = value of "bandwidth" metric
//   activeAlerts = count of alerts with status="active"

// FUNCTION: Generate Traffic Chart Data
//   ALGORITHM:
//     1. Filter metrics for "traffic_volume" type
//     2. Filter metrics for "hourly_threats" type
//     3. Sort both arrays by timestamp
//     4. Combine into chart format: { time, traffic, threats }
//   RESULT: Array of hourly data points for area chart

// LAYOUT:
//   ┌─────────────────────────────┐
//   │ Title | Status (Live/Offline)│  <- WebSocket status
//   ├─────────────────────────────┤
//   │ [Card] [Card] [Card] [Card] │  <- 4 metric cards
//   │ Threats|Connect |Traffic|Alert │
//   ├─────────────────────────────┤
//   │ [Chart: Traffic & Threats]   │  <- Area chart over time
//   │ [Recent Alerts List]         │  <- 5 most recent
//   ├─────────────────────────────┤
//   │ [Live Log Stream]            │  <- Scrollable log entries
//   └─────────────────────────────┘

// DATA LOADING:
//   isLoading states: metricsLoading, alertsLoading, logsLoading
//   While loading: Show Skeleton placeholders
//   Once loaded: Show actual data in cards/charts

// REAL-TIME UPDATES:
//   When log or alert created:
//     1. WebSocket sends message to browser
//     2. useLogStream callback fires
//     3. queryClient.invalidateQueries() refreshes data
//     4. React Query refetches from API
//     5. UI updates with new data
```

---

## 9. AUTHENTICATION FLOW (client/src/hooks/use-auth.ts)

```typescript
// PSEUDOCODE: Custom hook for authentication state management

// HOOK: useAuth()
//   PURPOSE: Manage authentication state and provide auth context
//   RETURNS:
//     {
//       isAuthenticated: boolean,
//       isCheckingAuth: boolean,
//       currentUser: { id, username } | null,
//       logout: () => Promise<void>
//     }

// ALGORITHM:
//   1. On mount: Call GET /api/auth/me
//      - If 200 -> User authenticated, get { id, username }
//      - If 401 -> User not authenticated
//
//   2. Provide authentication state to all components
//   3. Implement logout() function:
//      - Call POST /api/auth/logout
//      - Clear session
//      - Clear currentUser state
//      - Navigate to login page

// USAGE:
//   const { isAuthenticated, currentUser } = useAuth();
//   
//   if (!isAuthenticated) {
//     return <LoginPage />;
//   }
//   
//   return <Dashboard username={currentUser.username} />;
```

---

## 10. REAL-TIME LOG STREAMING (client/src/hooks/use-log-stream.ts)

```typescript
// PSEUDOCODE: WebSocket hook for real-time updates

// HOOK: useLogStream(onLogCreated, onAlertCreated)
//   PURPOSE: Establish WebSocket connection for real-time data
//   RETURNS: { isConnected, error, ws }

// ALGORITHM:
//   1. On mount:
//      a. Determine protocol: ws:// or wss:// (based on page protocol)
//      b. Connect to ws://{hostname}/ws/logs
//      c. Handle connection events:
//
//   2. onopen:
//      a. Set isConnected = true
//      b. Clear any previous errors
//
//   3. onmessage (received data):
//      a. Parse JSON message
//      b. Check message.type:
//         - "log_created" -> call onLogCreated(log)
//         - "alert_created" -> call onAlertCreated(alert)
//
//   4. onerror:
//      a. Set isConnected = false
//      b. Set error message
//
//   5. onclose:
//      a. Set isConnected = false
//      b. Attempt reconnection after 3 seconds
//      c. Create new WebSocket and retry
//
//   6. On unmount:
//      a. Close WebSocket connection

// MESSAGE FORMAT:
//   {
//     type: "log_created" | "alert_created",
//     data: Log | Alert,
//     timestamp: string
//   }

// STATUS INDICATOR:
//   Dashboard shows "Live" (green) when isConnected = true
//   Dashboard shows "Offline" (red) when isConnected = false
//   NOTE: Offline doesn't stop data display - REST API still works
```

---

## 11. DATA FETCHING (client/src/lib/queryClient.ts)

```typescript
// PSEUDOCODE: TanStack Query (React Query) configuration

// SETUP:
//   const queryClient = new QueryClient({
//     defaultOptions: {
//       queries: {
//         refetchOnWindowFocus: false,  // Don't auto-refetch when window focused
//         staleTime: Infinity,          // Data never goes stale auto
//       }
//     }
//   })

// FUNCTION: apiRequest(method, path, data)
//   PURPOSE: Make HTTP requests with authentication
//   ALGORITHM:
//     1. Add method (GET, POST, PATCH, DELETE)
//     2. Add path (/api/...)
//     3. Include request body (for POST/PATCH)
//     4. Include credentials (cookies for session auth)
//     5. Send request
//     6. Parse response JSON
//     7. Return data or throw error

// USAGE IN COMPONENTS:
//   // FETCHING DATA:
//   const { data: logs, isLoading } = useQuery({
//     queryKey: ["/api/logs/recent"],
//     // queryFn defaults to apiRequest("GET", "/api/logs/recent")
//   })
//
//   // MUTATING DATA:
//   const mutation = useMutation({
//     mutationFn: (newLog) => apiRequest("POST", "/api/logs", newLog)
//   })
//
//   // After mutation, invalidate cache:
//   queryClient.invalidateQueries({ queryKey: ["/api/logs/recent"] })

// CACHE INVALIDATION:
//   PURPOSE: Tell React Query to refetch data
//   PATTERN: After creating/updating/deleting, invalidate the query
//   EXAMPLE: Create log -> invalidate ["/api/logs/recent"] -> refetch -> UI updates
```

---

## 12. AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    USER JOURNEY                          │
└─────────────────────────────────────────────────────────┘

1. UNAUTHENTICATED:
   Browser -> GET http://localhost:5000
   ├─ App.tsx detects no session
   ├─ Renders LoginPage
   └─ User sees login form

2. USER CLICKS LOGIN:
   Form -> POST /api/auth/login { username, password }
   ├─ Server finds user in database
   ├─ Verifies password with bcryptjs
   ├─ Sets session cookie (HttpOnly, Secure)
   ├─ Responds with 200 + user data
   └─ Front-end reloads page

3. PAGE RELOAD - AUTHENTICATED:
   Browser -> GET http://localhost:5000
   ├─ Browser sends session cookie
   ├─ App.tsx calls useAuth hook
   ├─ useAuth makes GET /api/auth/me
   ├─ Server checks session.userId (cookie)
   ├─ Responds with 200 + user data
   ├─ App.tsx renders Dashboard (not LoginPage)
   └─ User sees dashboard with data

4. USER INTERACTS WITH DATA:
   ├─ GET /api/logs -> Shows logs
   ├─ GET /api/alerts -> Shows alerts
   ├─ GET /api/metrics -> Shows metrics
   └─ WebSocket /ws/logs -> Real-time updates

5. USER LOGOUT:
   Button -> POST /api/auth/logout
   ├─ Server destroys session
   ├─ Browser clears session cookie
   ├─ Response: 200 OK
   └─ Front-end navigates to login
```

---

## 13. LOG PROCESSING PIPELINE

```
┌──────────────────────────────────────────────────────────────┐
│              LOG CREATION & ANOMALY DETECTION                │
└──────────────────────────────────────────────────────────────┘

1. LOG CREATED:
   POST /api/logs { level, source, message, ipAddress, ... }
   
2. ROUTES.TS HANDLER:
   ├─ Validate with Zod schema
   ├─ Insert into database
   ├─ Trigger detectAnomalies() (async, non-blocking)
   ├─ Broadcast to WebSocket subscribers
   ├─ Evaluate custom rules
   └─ Return 201 Created

3. ANOMALY DETECTION (async):
   
   a) PATTERN MATCHING:
      - Failed login patterns → severity: high
      - Port scan patterns → severity: high
      - DDoS patterns → severity: critical
      - Privilege escalation → severity: critical
      - Data exfiltration → severity: critical
      - SQL injection → severity: high
      - Firewall block → severity: medium
      
      IF pattern matches → CREATE ALERT with severity
   
   b) AI ANALYSIS (if OpenAI key available):
      - For error/critical logs only
      - Send to OpenAI: message + metadata
      - Get response: { isAnomalous, confidence }
      - IF confidence > 0.6 AND anomalous → CREATE CRITICAL ALERT

4. ALERT CREATED:
   INSERT INTO alerts { severity, title, status='active', ... }
   BROADCAST to WebSocket: { type: "alert_created", data: alert }

5. WEBSOCKET BROADCAST:
   For all connected clients:
   └─ Send: { type: "alert_created", data: {...} }
      ├─ Client receives message
      ├─ useLogStream callback fires
      ├─ Invalidate React Query cache
      ├─ Refetch /api/alerts
      └─ UI updates with new alert

6. CUSTOM RULES EVALUATION:
   For each enabled rule:
   ├─ Parse rule.condition JSON
   ├─ Check if log matches conditions
   ├─ IF matches → CREATE ALERT with rule's severity
   └─ Handle as normal alert
```

---

## 14. DEPLOYMENT SETUP

```
ENVIRONMENT VARIABLES (in Replit Secrets):
├─ DATABASE_URL: PostgreSQL connection string (Neon)
├─ SESSION_SECRET: Random string for session encryption
├─ OPENAI_API_KEY: Optional, for AI anomaly detection
└─ NODE_ENV: development or production

WORKFLOW CONFIGURATION:
└─ Command: npm run dev
   ├─ Starts Express server on port 5000
   ├─ Loads Vite dev server for hot reload
   ├─ Watches for file changes
   └─ Auto-reloads both server and client

DATABASE SETUP:
└─ npm run db:push
   ├─ Creates tables if they don't exist
   ├─ Migrates schema changes
   └─ Seeds initial data on first run
```

---

## 15. KEY FEATURES SUMMARY

| Feature | Implementation |
|---------|-----------------|
| **Authentication** | Session-based with bcryptjs password hashing |
| **Authorization** | Middleware checks session before protected routes |
| **Logging** | All security events stored in PostgreSQL |
| **Alert Detection** | Pattern matching + OpenAI anomaly detection |
| **Real-time Updates** | WebSocket at /ws/logs broadcasts to all clients |
| **Custom Rules** | JSON-based rule engine for automated alerts |
| **Metrics & Charts** | Time-series data visualized with Recharts |
| **Responsive UI** | Mobile-friendly dashboard with Tailwind CSS |
| **Dark Mode** | Terminal-style dark theme (default) |
| **Data Persistence** | PostgreSQL with Drizzle ORM |

---

## 16. TEST CREDENTIALS

Use these to login and test the system:

```
Username: admin      Password: admin123
Username: demo       Password: demo123
Username: security   Password: security123
```

---

## 17. API ENDPOINT REFERENCE

```
AUTHENTICATION:
  POST   /api/auth/register        Create new account
  POST   /api/auth/login           Login with credentials
  POST   /api/auth/logout          Logout and destroy session
  GET    /api/auth/me              Get current user

LOGS:
  GET    /api/logs                 Get all logs
  GET    /api/logs/recent          Get recent logs with limit
  POST   /api/logs                 Create new log (triggers anomaly detection)

ALERTS:
  GET    /api/alerts               Get all alerts
  POST   /api/alerts               Create new alert
  PATCH  /api/alerts/:id/acknowledge  Mark as acknowledged
  PATCH  /api/alerts/:id/resolve      Mark as resolved

METRICS:
  GET    /api/metrics              Get all metrics
  POST   /api/metrics              Create new metric

NETWORK:
  GET    /api/network/events       Get network events
  POST   /api/network/events       Create network event

RULES:
  GET    /api/rules                Get all alerting rules
  POST   /api/rules                Create new rule
  PATCH  /api/rules/:id            Update rule
  DELETE /api/rules/:id            Delete rule

REAL-TIME:
  WS     /ws/logs                  WebSocket for real-time log/alert updates
```

---

This documentation covers the complete CyberGuard cybersecurity platform architecture, from data models to frontend components. Each section includes pseudocode explaining the logic and purpose of the code.
