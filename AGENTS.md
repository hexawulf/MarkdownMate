# AGENTS.md - MarkdownMate

## Project Snapshot

**MarkdownMate** is a real-time collaborative markdown editor with a VSCode-like experience.

- **Type**: Fullstack monolith (client + server + shared types)
- **Stack**: React 18 + Express + TypeScript + PostgreSQL + WebSockets
- **Structure**: `client/` (frontend), `server/` (backend), `shared/` (types/schemas)
- **Sub-docs**: See [client/AGENTS.md](client/AGENTS.md) and [server/AGENTS.md](server/AGENTS.md) for module-specific patterns

## Root Setup Commands

```bash
# Install dependencies
npm install

# Development (runs Vite dev server + Express backend)
npm run dev

# TypeScript check (no tests configured yet)
npm run check

# Build everything (client + server)
npm run build

# Production server
npm start

# Database migrations
npm run db:push
```

## Universal Conventions

### TypeScript
- **Strict mode enabled** - No `any` types without justification
- Import aliases: `@/` (client/src), `@shared/` (shared types)
- Check types before committing: `npm run check`

### Code Style
- **No ESLint/Prettier config** - Follow existing patterns manually
- Functional components with hooks (React)
- Use Tailwind utility classes for styling
- Follow shadcn/ui patterns for components (see `client/src/components/ui/`)

### Commits & Branches
- **Format**: `type(scope): description` (Conventional Commits)
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`
  - Example: `feat(editor): add real-time cursors`
- **Branch naming**: `feature/your-feature-name`, `fix/bug-description`

### PR Requirements
- Run `npm run check` (TypeScript validation)
- Run `npm run build` (ensure builds succeed)
- Manual testing required (no automated tests yet)

## Security & Secrets

- **Never commit**: API keys, Firebase config with secrets, `.env` files
- **Environment variables**: Store in `.env` (gitignored)
  - `DATABASE_URL` - PostgreSQL connection string
  - Firebase credentials in `FIREBASE_*` vars
- **PII**: User emails stored via Firebase Auth; handle with care

## JIT Index - Directory Map

### Module Structure
```
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   ├── stores/        # Zustand state
│   │   ├── lib/           # Utilities
│   │   └── types/         # Frontend-specific types
│   └── AGENTS.md          → [see client/AGENTS.md](client/AGENTS.md)
│
├── server/                # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # REST API endpoints
│   ├── db.ts              # Database connection
│   ├── firebaseAuth.ts    # Auth middleware
│   ├── storage.ts         # WebSocket management
│   └── AGENTS.md          → [see server/AGENTS.md](server/AGENTS.md)
│
└── shared/                # Shared TypeScript types
    └── schema.ts          # Drizzle ORM schemas + Zod validators
```

### Quick Find Commands
```bash
# Search for a function across all modules
rg -n "export (function|const) functionName"

# Find a React component
rg -n "export (function|const) ComponentName" client/src

# Find API routes
rg -n "app\.(get|post|patch|delete)" server/routes.ts

# Find database queries
rg -n "db\.(select|insert|update|delete)" server/

# Find Zustand stores
find client/src/stores -name "*.ts"

# Find shadcn/ui components
ls client/src/components/ui/
```

### Key Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite bundler config
- `tailwind.config.ts` - Tailwind CSS config
- `drizzle.config.ts` - Database ORM config
- `shared/schema.ts` - Database schema + types

## Definition of Done

Before creating a PR, verify:
- [ ] TypeScript passes: `npm run check`
- [ ] Builds succeed: `npm run build`
- [ ] Manual testing complete (no unit tests configured)
- [ ] No secrets committed (check `.env`, Firebase keys)
- [ ] Commit messages follow Conventional Commits format
- [ ] Code follows existing patterns (see module AGENTS.md files)
