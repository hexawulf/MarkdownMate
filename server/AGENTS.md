# AGENTS.md - Server (Express Backend)

## Package Identity

**Purpose**: Express.js REST API + WebSocket server for MarkdownMate  
**Tech**: Express + TypeScript + PostgreSQL (Drizzle ORM) + Firebase Auth + WebSockets

## Setup & Run

```bash
# From project root (runs Vite + Express together)
npm run dev
# Server runs on http://localhost:5004

# Build server only (outputs to dist/index.js)
npm run build:server

# Production server
npm start

# TypeScript check
npm run check

# Database migrations (push schema to DB)
npm run db:push
```

**Environment variables required** (`.env`):
- `DATABASE_URL` - PostgreSQL connection string
- Firebase configuration variables (see Firebase Admin SDK docs)

## Patterns & Conventions

### File Organization

```
server/
├── index.ts              # Express app entry point, HTTP + WS server
├── routes.ts             # REST API endpoints (all routes)
├── db.ts                 # Database connection (Drizzle client)
├── firebaseAuth.ts       # Firebase Auth middleware
├── storage.ts            # WebSocket session management
├── vite.ts               # Vite dev middleware integration
└── src/
    └── logger/           # Winston logging configuration
```

### API Route Patterns

**✅ DO: Define routes in `routes.ts` with `registerRoutes()`**
```typescript
// Example from server/routes.ts
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply auth middleware
  app.get('/api/documents', devAuth, async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    
    const userDocs = await db.select()
      .from(documents)
      .where(eq(documents.authorId, userId))
      .orderBy(desc(documents.updatedAt));
    
    res.json(userDocs);
  });
  
  // ... more routes
}
```

**✅ DO: Use TypeScript types from `@shared/schema`**
```typescript
import { users, documents, folders } from "../shared/schema";
import type { DocumentWithDetails } from "../shared/schema";
```

**✅ DO: Use Drizzle ORM for database queries**
```typescript
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

// SELECT with WHERE clause
const doc = await db.select()
  .from(documents)
  .where(eq(documents.id, documentId))
  .limit(1);

// INSERT
const [newDoc] = await db.insert(documents)
  .values({
    title: "New Document",
    content: "",
    authorId: userId,
  })
  .returning();

// UPDATE
await db.update(documents)
  .set({ content: newContent, updatedAt: new Date() })
  .where(eq(documents.id, docId));

// DELETE
await db.delete(documents)
  .where(eq(documents.id, docId));
```

**✅ DO: Use `devAuth` middleware for protected routes**
```typescript
// Development mode: auto-authenticates as demo user
// Production: verifies Firebase ID token
app.get('/api/protected', devAuth, async (req: any, res: Response) => {
  const userId = req.user.claims.sub; // Firebase UID
  // ... handle authenticated request
});
```

**❌ DON'T: Use raw SQL queries**
```typescript
// Bad - use Drizzle ORM instead
const result = await db.execute("SELECT * FROM documents");

// Good
const result = await db.select().from(documents);
```

**❌ DON'T: Forget to handle errors**
```typescript
// Bad
app.get('/api/documents', async (req, res) => {
  const docs = await db.select().from(documents);
  res.json(docs);
});

// Good
app.get('/api/documents', async (req, res) => {
  try {
    const docs = await db.select().from(documents);
    res.json(docs);
  } catch (error) {
    logger.error("Failed to fetch documents", { error });
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});
```

### Authentication

**✅ Firebase Auth with `devAuth` middleware**
```typescript
// server/firebaseAuth.ts exports:
// - setupAuth(app) - initializes Firebase Admin
// - isAuthenticated - middleware for production
// - devAuth - middleware that auto-auths in dev mode

// In routes.ts:
const devAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      claims: {
        sub: 'dev-user-1',
        email: 'demo@example.com',
        displayName: 'Demo User'
      }
    };
    return next();
  }
  return isAuthenticated(req, res, next);
};
```

**✅ Access user ID from `req.user.claims.sub`**
```typescript
app.get('/api/user', devAuth, async (req: any, res: Response) => {
  const userId = req.user.claims.sub; // Firebase UID
  const user = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  res.json(user[0]);
});
```

### Database Schema

**✅ Schema defined in `shared/schema.ts`** (Drizzle ORM)
```typescript
// Key tables:
// - users (id: Firebase UID, email, displayName, photoURL)
// - documents (id, title, content, authorId, folderId, isPublic)
// - folders (id, name, authorId, parentId)
// - documentCollaborators (documentId, userId, permission)

// Import schemas:
import { users, documents, folders, documentCollaborators } from "../shared/schema";
```

**✅ Migrations with Drizzle Kit**
```bash
# After changing shared/schema.ts:
npm run db:push  # Pushes schema changes to database
```

### WebSocket Patterns

**✅ WebSocket setup in `index.ts`**
```typescript
// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const userId = getUserIdFromRequest(req); // Parse from query/cookie
  
  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    // Handle real-time collaboration
  });
  
  ws.on("close", () => {
    // Clean up session
  });
});
```

**✅ Session management in `storage.ts`**
```typescript
// Tracks active WebSocket connections per document
const documentSessions = new Map<number, Set<{ ws: WebSocket; userId: string }>>();
```

### Logging

**✅ Use Winston logger from `src/logger/`**
```typescript
import { logger } from "./src/logger";

logger.info("Document created", { documentId, userId });
logger.error("Database query failed", { error, query });
logger.warn("Deprecated API endpoint called", { endpoint });
```

## Touch Points / Key Files

### Core Server
- **Entry point**: `server/index.ts` - Express app + HTTP/WebSocket servers
- **Routes**: `server/routes.ts` - All REST API endpoints
- **Database**: `server/db.ts` - Drizzle client instance
- **Auth**: `server/firebaseAuth.ts` - Firebase Admin SDK setup + middleware

### Database
- **Schema**: `shared/schema.ts` - Drizzle table definitions + Zod validators
- **Migrations**: `migrations/` - SQL migration files (generated by Drizzle Kit)
- **Config**: `drizzle.config.ts` - Drizzle Kit configuration

### Real-time
- **WebSocket**: `server/index.ts` - WebSocket server setup
- **Sessions**: `server/storage.ts` - Active connection tracking

## JIT Index Hints

```bash
# Find API routes
rg -n "app\.(get|post|patch|delete|put)" server/routes.ts

# Find database queries
rg -n "db\.(select|insert|update|delete)" server/

# Find WebSocket message handlers
rg -n "ws\.on\(" server/

# Find Firebase Auth usage
rg -n "getAuth\(\)" server/

# Find all exported functions
rg -n "export (async function|function|const)" server/

# Check schema tables
rg -n "export const \w+ = pgTable" shared/schema.ts

# Find logger usage
rg -n "logger\.(info|error|warn|debug)" server/
```

## Common Gotchas

### Authentication
- **Development mode**: `devAuth` auto-authenticates as `dev-user-1`
- **Production**: Requires Firebase ID token in Authorization header
- Always access user via `req.user.claims.sub` (Firebase UID)

### Database Connection
- **Requires `DATABASE_URL` in `.env`** - server won't start without it
- Connection pooling handled by Drizzle's Neon driver
- Check `server/db.ts` for connection configuration

### WebSocket URLs
- Client connects to: `ws://localhost:5004/ws` (dev) or `wss://domain.com/ws` (prod)
- Auth handled via query params or session cookies (see implementation)

### TypeScript Types
- Import from `@shared/schema` for consistency:
  ```typescript
  import type { Document, Folder, User } from "../shared/schema";
  ```
- Use Zod validators for request body validation (see `shared/schema.ts`)

### Error Handling
- Always wrap async route handlers in try-catch
- Use logger for error tracking (Winston)
- Return consistent error responses:
  ```typescript
  res.status(500).json({ error: "Human-readable error message" });
  ```

### Database Indexes
- Performance indexes defined in `shared/schema.ts`:
  - `idx_documents_author_id` - for user's documents
  - `idx_documents_folder_id` - for folder contents
  - See full index list in schema

## Pre-PR Checks

```bash
# Run from project root
npm run check          # TypeScript validation
npm run build:server   # Ensure server builds successfully
npm run db:push        # Apply any schema changes

# Test manually:
# 1. Start dev server: npm run dev
# 2. Test API endpoints with curl/Postman/Thunder Client
# 3. Check logs for errors (console or logs/ directory)
# 4. Verify database changes with SQL client if schema updated
```

**Manual testing checklist**:
- [ ] API endpoints return expected responses
- [ ] Authentication works (dev mode or real Firebase tokens)
- [ ] Database queries succeed (check logs)
- [ ] WebSocket connections establish correctly
- [ ] No TypeScript errors in `npm run check`
- [ ] No sensitive data logged or exposed
