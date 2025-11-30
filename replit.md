# CyberGuard Network Security Monitoring Platform

## Overview

CyberGuard is an enterprise-grade cybersecurity network monitoring platform designed for real-time security analysis, log management, alert tracking, and network traffic monitoring. The application provides a comprehensive dashboard for security operations, featuring data visualization, threat detection, and incident response capabilities.

The platform is built as a full-stack TypeScript application with a focus on information density, rapid comprehension, and terminal-aesthetic design principles inspired by Carbon Design System.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing (Dashboard, Log Analysis, Alerts, Network Monitor)

**Component System**
- **shadcn/ui** component library (New York style) built on Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **Class Variance Authority (CVA)** for component variant management
- All UI components follow a consistent design system with predefined spacing (2, 4, 6, 8 units), border radius, and color schemes

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management, caching, and data synchronization
- Custom query client configuration with no automatic refetching (manual refresh model)
- API requests abstracted through `apiRequest` utility function with credential handling

**Design System**
- **Carbon Design System** principles adapted for cybersecurity monitoring
- **Terminal aesthetics** with monospace fonts (JetBrains Mono) for technical data
- **Dark mode** as primary theme with high-contrast color scheme
- Information-dense layouts prioritizing scanability and data comprehension
- 12-column grid system for flexible dashboard widget placement

### Backend Architecture

**Server Framework**
- **Express.js** as the HTTP server
- **TypeScript** with ES modules throughout
- Separate development (`index-dev.ts`) and production (`index-prod.ts`) entry points

**Development vs Production**
- **Development**: Vite middleware integration for HMR, live reloading of server-side code via `tsx`
- **Production**: Static file serving from pre-built `dist/public` directory, bundled server code via `esbuild`

**API Structure**
- RESTful API endpoints under `/api` prefix
- Resource-based routing:
  - `/api/logs` - Log entries with filtering and pagination
  - `/api/alerts` - Security alerts with acknowledgment/resolution workflows
  - `/api/network/events` - Network traffic events
  - `/api/metrics` - System and security metrics
- Request validation using Zod schemas derived from Drizzle ORM models

**Logging & Monitoring**
- Custom logging middleware tracking request duration and response data
- Request/response interception for debugging API calls
- Raw body preservation for webhook/signature verification scenarios

### Data Storage Solutions

**Database**
- **PostgreSQL** as the primary database (via Neon serverless driver `@neondatabase/serverless`)
- **Drizzle ORM** for type-safe database queries and schema management
- Database schema defined in `shared/schema.ts` with four main tables:
  - `logs` - Security event logs with timestamp, level, source, IP, event type, and metadata
  - `alerts` - Security alerts with severity levels, status tracking (active/acknowledged/resolved)
  - `networkEvents` - Network traffic monitoring with protocol, port, bytes transferred, and status
  - `metrics` - Time-series metrics for bandwidth, connections, threats, and traffic volume

**In-Memory Storage**
- `MemStorage` class providing in-memory implementation of `IStorage` interface
- Used for development/testing with seeded sample data
- Implements full CRUD operations matching the database interface

**Schema Validation**
- Zod schemas generated from Drizzle tables using `drizzle-zod`
- Type-safe insert and select operations
- Shared schema definitions between client and server via `@shared` alias

### Authentication and Authorization

**Current State**
- No authentication layer currently implemented
- Session infrastructure prepared via `connect-pg-simple` (PostgreSQL session store)
- Query client configured to handle 401 responses with configurable behavior

**Prepared Infrastructure**
- Express session middleware ready for integration
- Cookie-based session management
- API endpoints designed to support future user context

### External Dependencies

**UI Component Libraries**
- **Radix UI** - Unstyled, accessible component primitives (accordion, dialog, dropdown, popover, tabs, tooltip, etc.)
- **Recharts** - Chart library for data visualization (line charts, area charts)
- **Embla Carousel** - Carousel/slider functionality
- **cmdk** - Command palette interface (Command+K style)

**Development Tools**
- **Replit-specific plugins**: 
  - `@replit/vite-plugin-cartographer` - Code navigation
  - `@replit/vite-plugin-dev-banner` - Development mode indicator
  - `@replit/vite-plugin-runtime-error-modal` - Runtime error overlay

**Utilities**
- **date-fns** - Date formatting and manipulation
- **clsx + tailwind-merge** - Conditional className handling
- **nanoid** - Unique ID generation
- **lucide-react** - Icon library

**Database & ORM**
- **Drizzle ORM** (`drizzle-orm`) - Type-safe SQL query builder
- **Drizzle Kit** - Database migrations and schema management
- **@neondatabase/serverless** - Serverless PostgreSQL driver

**Type Safety**
- Full TypeScript coverage across client, server, and shared code
- Path aliases configured: `@/` (client), `@shared/` (shared schema/types), `@assets/` (assets)
- Strict TypeScript configuration with incremental builds