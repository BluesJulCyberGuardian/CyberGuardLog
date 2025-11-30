# Cybersecurity Network Monitoring Platform - Design Guidelines

## Design Approach: System-Based (Carbon Design System + Terminal Aesthetics)

**Rationale**: This is a data-intensive, enterprise-grade monitoring tool where clarity, efficiency, and information density are paramount. Carbon Design System's approach to complex data interfaces combined with terminal-inspired aesthetics creates the professional cybersecurity aesthetic required.

**Core Principles**:
- Information density over decoration
- Scanability and rapid comprehension
- Terminal/command-line visual language
- Persistent context and status awareness

---

## Typography Hierarchy

**Font Stack**: 
- Primary: JetBrains Mono (monospace for logs/code)
- Secondary: Inter (UI elements, labels, metrics)

**Scale**:
- Page Headers: text-2xl font-semibold (dashboards, main sections)
- Section Headers: text-lg font-medium (widget titles, log categories)
- Data Labels: text-sm font-medium uppercase tracking-wide (metric labels, table headers)
- Body Text: text-sm (log entries, descriptions, status messages)
- Monospace Content: font-mono text-xs (IP addresses, timestamps, log data, code snippets)
- Metrics/Numbers: text-3xl font-bold tabular-nums (threat counts, bandwidth stats)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 8** exclusively
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Card spacing: space-y-4
- Dashboard grid gaps: gap-6 or gap-8

**Grid Structure**:
- Main dashboard: 12-column grid system for flexible widget placement
- Sidebar: Fixed 256px (w-64) navigation with collapsible capability
- Content area: Full remaining width with max-w-none
- Widget cards: Span 3, 4, 6, or 12 columns based on content density

**Responsive Breakpoints**:
- Mobile: Single column stack, collapsible sidebar
- Desktop: Multi-column dashboard grid (grid-cols-12)

---

## Component Library

### Navigation & Layout
- **Top Bar**: Fixed header with breadcrumb navigation, global search, user profile, notification bell with badge
- **Sidebar**: Collapsible left navigation with icon + label pattern, active state indicators, grouped sections (Dashboard, Logs, Alerts, Analytics, Settings)
- **Status Bar**: Bottom fixed bar showing system status, connection health, last update timestamp

### Dashboard Widgets
- **Metric Cards**: Compact cards displaying single KPIs (threat count, active connections, bandwidth) with trend indicators (↑↓) and sparkline graphs
- **Network Activity Map**: Live visualization showing connection origins with pulsing dots for active traffic
- **Alert Feed**: Scrollable vertical list with severity badges, timestamps, and expandable details
- **Log Stream**: Terminal-style scrolling log output with syntax highlighting, line numbers, and filter chips
- **Timeline Chart**: Horizontal timeline showing security events over time with color-coded severity markers
- **Traffic Graph**: Real-time line/area charts showing network throughput and packet analysis

### Data Display
- **Tables**: Dense data tables with sortable columns, row hover states, inline actions, sticky headers, alternating row treatment
- **Log Viewer**: Full-width terminal interface with search highlighting, line wrap toggle, copy buttons
- **Alert Cards**: Expandable cards with header showing severity badge, icon, title, timestamp; body revealing full details and recommended actions
- **Status Indicators**: Dot indicators (online/offline/warning), pill badges for severity levels (Critical/High/Medium/Low/Info)

### Interactive Elements
- **Search Bar**: Prominent search with autocomplete dropdown, filter pills beneath showing active filters
- **Filter Panel**: Collapsible side panel with checkbox groups, date range pickers, IP address input
- **Action Buttons**: Primary actions (Acknowledge, Investigate, Block), secondary ghost buttons for supplementary actions
- **Toggle Switches**: For enabling/disabling monitors, auto-refresh, notifications

### Specialized Components
- **Threat Severity Badge**: Small pills with high contrast (use border for differentiation, not color alone)
- **Connection Flow Diagram**: Sankey-style visualization showing traffic flow between nodes
- **Geolocation Widget**: Mini world map with pin markers for threat origins
- **Code Block**: Syntax-highlighted panels for showing rule configurations, log snippets

---

## Animations

**Minimal Motion Approach**:
- Real-time data: Smooth number counting animations (duration-300)
- New alerts: Subtle slide-in from top (duration-200)
- Chart updates: Linear transitions for data points (duration-500)
- NO hover animations, parallax, or decorative motion
- Focus on functional feedback only (loading states, data updates)

---

## Images

**No Hero Images**: This is a utility application - skip traditional hero sections entirely.

**Icon Usage**:
- Use **Heroicons** (outline style) via CDN for UI icons
- Terminal/command prompt icons for log sections
- Shield/lock icons for security features
- Network/server icons for infrastructure elements
- Alert triangle/exclamation for warnings

**Data Visualizations**:
- Use Chart.js or D3.js libraries for graphs and charts
- Network topology diagrams using SVG illustrations
- Map visualizations via Leaflet or similar mapping library

---

## Page-Specific Layouts

### Dashboard (Landing Page)
- **No hero section** - immediately show grid of monitoring widgets
- 3-column layout on desktop: Stats cards (top row), Live log stream (left column, spans 8 cols), Alert feed (right sidebar, spans 4 cols), Network activity chart (bottom, full width)
- Persistent top bar with quick filters and time range selector

### Log Analysis Page
- Full-width log viewer as primary focus (terminal aesthetic)
- Top: Filter bar with search, date range, severity toggles
- Left sidebar: Log source categories (Application, System, Network, Security)
- Right sidebar: Quick stats and detected patterns
- Bottom: Pagination and export controls

### Alert Management
- Table view as default with cards view toggle
- Bulk action bar when items selected
- Expandable rows revealing detailed alert information
- Status filter tabs (Active, Acknowledged, Resolved, All)

### Network Monitor
- Split view: Live network diagram (left 60%) + Connection details table (right 40%)
- Mini timeline scrubber at bottom for historical playback
- Floating control panel for visualization settings

---

**Visual Density**: Embrace information density - show more data per screen, use compact spacing, maximize scanability through consistent patterns and visual hierarchy rather than excessive whitespace.