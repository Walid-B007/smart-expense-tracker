# Architecture Documentation

## System Overview

The Supply Control Tower is a full-stack expense tracking application built with a modern monorepo structure using npm workspaces.

## Core Components

### 1. Frontend (React + TypeScript)

**Location**: `packages/frontend/`

**Key Technologies**:
- React 18 with functional components and hooks
- TypeScript for type safety
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- Recharts for data visualization
- React Router for client-side routing

**Architecture Pattern**:
- **Contexts**: Authentication state management
- **Pages**: Route-level components
- **Components**: Reusable UI components
- **Lib**: Utilities and API client

**Data Flow**:
```
User Interaction → Page Component → API Call (via lib/api.ts)
→ Backend → Database → Response → State Update → UI Re-render
```

### 2. Backend (Node.js + Fastify)

**Location**: `packages/backend/`

**Key Technologies**:
- Fastify web framework
- TypeScript for type safety
- Supabase client for database access
- Node-cron for scheduled jobs
- Zod for request validation

**Architecture Pattern**: Layered Architecture
```
Routes (HTTP handlers)
    ↓
Services (Business logic)
    ↓
Database (Supabase/PostgreSQL)
```

**Service Layer Components**:

1. **LLM Classifier** (`services/llm/`)
   - Interface-based design for provider swapping
   - DeepSeek provider implementation
   - Rule-based fallback classifier
   - Batch processing with retry logic

2. **FX Provider** (`services/fx/`)
   - Interface for exchange rate providers
   - ExchangeRate.host implementation
   - Database caching layer
   - Historical rate lookups

3. **File Parser** (`services/file-parser/`)
   - CSV parsing via Papaparse
   - XLSX parsing via SheetJS
   - Column mapping suggestions
   - Data validation rules

### 3. Database (PostgreSQL via Supabase)

**Schema Design**:

**Core Tables**:
- `users`: User profiles
- `accounts`: Financial accounts (checking, savings, etc.)
- `transactions`: All financial transactions
- `categories`: Hierarchical category structure
- `transfers`: Links between transfer transactions

**Feature Tables**:
- `category_suggestions`: LLM-generated suggestions
- `fx_rates`: Exchange rate cache
- `import_jobs`: Import tracking
- `import_rows`: Staging for imports
- `merchant_normalization`: Merchant name mapping
- `recurring_patterns`: Recurring transaction detection

**Security Features**:
- Row Level Security (RLS) on all tables
- User-scoped access policies
- Automatic user ID injection
- Service role for admin operations

**Performance Optimizations**:
- Indexes on foreign keys
- Indexes on frequently queried columns
- Composite indexes for common filters
- Trigger-based balance updates

### 4. Authentication Flow

```
User enters credentials
    ↓
Frontend → Supabase Auth (via supabase.auth.signIn)
    ↓
Supabase returns JWT + session
    ↓
Frontend stores session in localStorage
    ↓
API requests include JWT in Authorization header
    ↓
Backend validates JWT with Supabase
    ↓
Request proceeds with user context
```

### 5. Transaction Import Flow

```
1. File Upload
   User selects CSV/XLSX → Frontend uploads to backend

2. Parsing
   Backend parses file → Extracts headers and rows

3. Column Mapping
   System suggests mappings → User confirms/adjusts

4. Validation
   Each row validated → Errors flagged

5. Preview
   User reviews valid rows → Selects target account

6. Import
   Valid rows inserted as transactions

7. Classification
   Background job categorizes new transactions via LLM
```

### 6. LLM Classification Flow

```
Transaction Created (without category)
    ↓
Async classification job triggered
    ↓
Build prompt with transaction details + available categories
    ↓
Send to DeepSeek API
    ↓
Parse response (with fallback to rule-based)
    ↓
Store suggestion in category_suggestions table
    ↓
If confidence > threshold: auto-apply
    ↓
User can review/override in Classify page
```

### 7. FX Conversion Flow

```
Transaction in non-display currency
    ↓
Look up rate for (transaction_date, from_currency, to_currency)
    ↓
If cached in fx_rates: use cached rate
    ↓
If not cached: fetch from external API
    ↓
Cache rate in database
    ↓
Apply rate to convert amount
    ↓
Display converted amount
```

### 8. Background Jobs

**Daily FX Update** (cron: `0 1 * * *`):
- Runs at 1 AM daily
- Fetches latest rates for major currencies
- Stores in `fx_rates` table
- Handles rate limiting and retries

**Transaction Classification**:
- Triggered on transaction creation
- Batches up to 10 transactions
- Rate limits API calls
- Falls back to rules on failure

## API Design

### RESTful Endpoints

**Authentication**: `/api/auth/*`
- Stateless JWT authentication
- Tokens expire based on Supabase config
- Refresh handled by Supabase client

**Resources**: `/api/{resource}`
- Standard CRUD operations
- Filtering via query parameters
- Pagination support
- Consistent error responses

**Dashboard**: `/api/dashboard/*`
- Aggregated data endpoints
- Currency conversion on-the-fly
- Date range filtering
- Multiple period groupings

### Error Handling

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: error.errors });
  }
  return reply.status(500).send({
    error: error.message || 'Internal server error'
  });
}
```

### Request Validation

Using Zod schemas:
```typescript
const createAccountSchema = z.object({
  name: z.string().min(1),
  account_type: z.enum(['checking', 'savings', ...]),
  currency: z.string().length(3),
});
```

## Frontend Architecture

### State Management

**Authentication State**: React Context (`AuthContext`)
- Global user state
- Session management
- Auto-refresh handling

**Component State**: React hooks
- `useState` for local state
- `useEffect` for side effects
- No external state library needed

### API Communication

**Centralized API Client** (`lib/api.ts`):
- Axios instance with baseURL
- Automatic token injection
- Typed request/response
- Error handling

### Routing

**React Router v6**:
- Protected routes with auth check
- Nested layouts
- Loading states
- 404 handling

### Styling

**Tailwind CSS**:
- Utility-first approach
- Custom color palette
- Responsive design utilities
- Dark mode ready (not implemented)

**Component Patterns**:
- Headless UI for accessible components
- Custom utility classes in `index.css`
- Consistent spacing scale
- Semantic color naming

## Data Consistency

### Transaction Balance Updates

Triggers ensure account balances stay in sync:

```sql
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();
```

### Transfer Double-Counting Prevention

- Transfers link two transactions
- Both transactions use "Transfer" category
- Dashboard excludes transfer category from spending
- Transfer table tracks FX rate for cross-currency

### Import Deduplication

- Store raw import data in `import_rows`
- Validate before inserting to `transactions`
- Option to skip duplicates based on:
  - Same date, amount, description
  - Same reference number
  - User confirmation

## Scalability Considerations

### Database

**Current**: Single Supabase instance
**Scaling**:
- Supabase handles automatic connection pooling
- Read replicas available on paid plans
- Can add Redis for session/rate caching
- Partition large tables by date

### Backend

**Current**: Single Fastify process
**Scaling**:
- Stateless design allows horizontal scaling
- Add load balancer (Nginx, Cloudflare)
- Deploy multiple instances
- Separate classification workers

### Frontend

**Current**: SPA with client-side routing
**Scaling**:
- CDN for static assets
- Code splitting by route
- Lazy loading for charts
- Image optimization

### LLM Costs

**Current**: Pay-per-request to DeepSeek
**Optimization**:
- Batch processing reduces API calls
- Cache suggestions for similar transactions
- Rule-based fallback reduces API usage
- User corrections improve future accuracy

## Security Considerations

### Authentication
- JWT tokens with expiration
- Refresh tokens handled by Supabase
- Passwords hashed by Supabase Auth
- Rate limiting on auth endpoints

### Authorization
- Row Level Security enforces user isolation
- API validates user ID matches resource owner
- Service role key only on backend
- Anon key with limited permissions on frontend

### Data Protection
- Sensitive data in environment variables
- Database credentials never exposed
- HTTPS in production
- CORS restricted to specific origin

### Input Validation
- Zod schemas validate all inputs
- SQL injection prevented by Supabase client
- File uploads limited to 10MB
- CSV/XLSX parsing with error handling

## Monitoring & Debugging

### Logging
- Fastify built-in logger
- Console logs for key operations
- Error stack traces in development
- Structured logs for production

### Health Checks
- `/health` endpoint returns 200 + timestamp
- Database connection check
- Service status monitoring

### Error Tracking
- Console error logging
- Sentry integration ready (not implemented)
- User-friendly error messages
- Detailed logs for debugging

## Development Workflow

### Local Development
```bash
npm run dev          # Both frontend + backend
npm run dev:backend  # Backend only
npm run dev:frontend # Frontend only
```

### Testing
```bash
npm test             # All tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Building
```bash
npm run build        # Build all packages
```

### Database
```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run fx:update    # Update FX rates
```

## Deployment

### Replit
- Single-command deployment
- Environment variables via Secrets
- Automatic HTTPS
- Built-in monitoring

### Docker
- `docker-compose.yml` provided
- Separate containers for frontend/backend
- PostgreSQL container for local testing
- Nginx for frontend serving

### Manual
- Build frontend: `npm run build --workspace=frontend`
- Build backend: `npm run build --workspace=backend`
- Serve frontend: Nginx or any static server
- Run backend: `node packages/backend/dist/index.js`

---

This architecture is designed for:
- **Maintainability**: Clear separation of concerns
- **Scalability**: Stateless, horizontally scalable
- **Security**: Defense in depth approach
- **Performance**: Optimized queries, caching, lazy loading
- **Developer Experience**: TypeScript, hot reload, good tooling
