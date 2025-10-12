# Supply Control Tower - Expense Tracker

A full-stack expense tracking application with AI-powered transaction categorization, multi-currency support, and comprehensive financial analytics.

## 🌟 Features

- **AI-Powered Categorization**: Automatic transaction classification using DeepSeek LLM
- **Multi-Currency Support**: Track expenses across multiple currencies with automatic FX conversion
- **Transaction Import**: CSV/XLSX file upload with intelligent column mapping
- **Transfer Management**: Link transactions between accounts to avoid double-counting
- **Rich Analytics**: Interactive dashboards with spending breakdowns and cash flow visualizations
- **Account Management**: Multiple accounts with different currencies and types
- **Batch Classification**: Review and categorize multiple transactions at once
- **Merchant Enrichment**: Automatic merchant name normalization and categorization

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Deploying to Replit](#deploying-to-replit)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React + TypeScript + Tailwind CSS + Recharts              │
│  - Authentication (Supabase Auth)                           │
│  - File Upload & Column Mapping                             │
│  - Dashboard & Analytics                                    │
│  - Transaction Management                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  Node.js + Fastify + TypeScript                             │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │  API Routes  │  Services    │  Background Jobs     │    │
│  ├──────────────┼──────────────┼──────────────────────┤    │
│  │ /auth        │ LLM          │ Daily FX Updates     │    │
│  │ /accounts    │ FX Provider  │ Classification       │    │
│  │ /transactions│ File Parser  │ Batch Processing     │    │
│  │ /imports     │ Classifier   │                      │    │
│  │ /dashboard   │              │                      │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase (PostgreSQL)                        │
│  - User Authentication                                       │
│  - Transaction Storage                                       │
│  - FX Rate Cache                                            │
│  - Category Management                                      │
│  - Row Level Security (RLS)                                 │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  - DeepSeek API (LLM Classification)                        │
│  - ExchangeRate.host (FX Rates)                             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Headless UI** for accessible components
- **Recharts** for data visualization
- **React Router** for navigation
- **Supabase JS Client** for authentication

### Backend
- **Node.js 18+**
- **Fastify** web framework
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **Papaparse** for CSV parsing
- **SheetJS (xlsx)** for Excel parsing
- **Node-cron** for scheduled jobs
- **Axios** for HTTP requests
- **Zod** for validation

### Database & Infrastructure
- **PostgreSQL** (via Supabase)
- **Row Level Security** for data isolation
- **Triggers** for automatic balance updates
- **Indexes** for query optimization

### LLM & APIs
- **DeepSeek API** for transaction categorization
- **ExchangeRate.host** for FX rates

## 📦 Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Supabase Account**: [Sign up](https://supabase.com)
- **DeepSeek API Key**: [Get API key](https://platform.deepseek.com)

## 💻 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd supply-control-tower
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials (see [Configuration](#configuration) below).

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepSeek LLM Configuration
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Foreign Exchange API
FX_PROVIDER_URL=https://api.exchangerate.host
FX_PROVIDER_KEY=optional-api-key

# Application Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-min-32-chars

# Frontend Environment Variables (create packages/frontend/.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Go to **Settings** > **API**
4. Copy the following:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Getting DeepSeek API Key

1. Sign up at [DeepSeek Platform](https://platform.deepseek.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy to `DEEPSEEK_API_KEY`

## 🚀 Running Locally

### 1. Setup Database

Run migrations on your Supabase database:

```bash
# Option 1: Using the Supabase CLI (recommended)
supabase db push

# Option 2: Manually execute SQL files
# Go to Supabase Dashboard > SQL Editor
# Run each migration file in order:
# - packages/backend/migrations/001_initial_schema.sql
# - packages/backend/migrations/002_seed_system_categories.sql
# - packages/backend/migrations/003_seed_merchant_data.sql
```

### 2. Seed Demo Data

```bash
npm run db:seed
```

This creates:
- Demo user: `demo@example.com` / `demo123456`
- 3 accounts (USD, AUD, Credit Card)
- Sample transactions with various categories
- FX rates (if API key provided)

### 3. Start Development Servers

**Option A: Run both frontend and backend** (recommended):
```bash
npm run dev
```

**Option B: Run separately**:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🌐 Deploying to Replit

### 1. Create a New Repl

1. Go to [Replit](https://replit.com)
2. Click **Create Repl**
3. Choose **Import from GitHub**
4. Paste your repository URL
5. Select **Node.js** as the template

### 2. Configure Environment

In Replit, go to the **Secrets** (lock icon) and add all environment variables from the `.env` file.

### 3. Install Dependencies

Replit should automatically detect `package.json` and install dependencies. If not, run:

```bash
npm install
```

### 4. Set up Supabase

Since Replit provides a public URL, update these environment variables:

```bash
FRONTEND_URL=https://your-repl-name.your-username.repl.co
```

Also update the Supabase project settings:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add your Replit URL to **Site URL** and **Redirect URLs**

### 5. Run Database Migrations

Open the Shell in Replit and run:

```bash
# Execute migrations in Supabase Dashboard SQL Editor
# Or use Supabase CLI if installed
```

### 6. Seed Database

```bash
npm run db:seed
```

### 7. Start the Application

Click the **Run** button in Replit, or manually run:

```bash
npm run dev
```

### 8. Configure Replit Deployment

The `.replit` file is already configured. For production deployment:

1. Click **Deploy** in Replit
2. Choose deployment type (Autoscale recommended)
3. Set environment to `production`
4. Deploy!

## 🗄️ Database Setup

### Schema Overview

The database consists of the following main tables:

- **users**: User profiles (extends Supabase auth.users)
- **accounts**: Bank accounts, credit cards, etc.
- **transactions**: All financial transactions
- **categories**: Expense/income categories (hierarchical)
- **category_suggestions**: LLM-generated category suggestions
- **transfers**: Links between transfer transactions
- **fx_rates**: Foreign exchange rate cache
- **import_jobs**: Transaction import job tracking
- **import_rows**: Staging area for imported data
- **merchant_normalization**: Merchant name mapping
- **recurring_patterns**: Recurring transaction detection

### Running Migrations

Migrations are located in `packages/backend/migrations/`. Execute them in order:

```bash
# Using Supabase CLI
cd packages/backend
supabase db push

# Or manually in Supabase Dashboard
# Go to SQL Editor and run each file in order
```

### Updating FX Rates

To manually update foreign exchange rates:

```bash
npm run fx:update
```

This runs automatically daily via cron (1 AM server time).

## 🧪 Running Tests

### Backend Tests

```bash
# Run all tests
npm test --workspace=backend

# Run with coverage
npm run test:coverage --workspace=backend

# Watch mode
npm run test:watch --workspace=backend
```

### Frontend Tests

```bash
# Run all tests
npm test --workspace=frontend

# Watch mode
npm run test:watch --workspace=frontend
```

### Run All Tests

```bash
npm test
```

## 📁 Project Structure

```
supply-control-tower/
├── packages/
│   ├── backend/                 # Node.js backend
│   │   ├── src/
│   │   │   ├── config/          # Configuration
│   │   │   ├── db/              # Database clients
│   │   │   ├── middleware/      # Auth middleware
│   │   │   ├── routes/          # API routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── imports.ts
│   │   │   │   ├── transfers.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   └── fx.ts
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── llm/         # LLM classification
│   │   │   │   ├── fx/          # FX rate provider
│   │   │   │   └── file-parser/ # CSV/XLSX parsing
│   │   │   ├── types/           # TypeScript types
│   │   │   ├── cron/            # Scheduled jobs
│   │   │   └── index.ts         # Entry point
│   │   ├── migrations/          # Database migrations
│   │   ├── scripts/             # Utility scripts
│   │   │   ├── seed.ts
│   │   │   ├── migrate.js
│   │   │   └── update-fx-rates.ts
│   │   └── package.json
│   │
│   └── frontend/                # React frontend
│       ├── src/
│       │   ├── components/      # Reusable components
│       │   │   └── Layout.tsx
│       │   ├── contexts/        # React contexts
│       │   │   └── AuthContext.tsx
│       │   ├── lib/             # Utilities
│       │   │   ├── api.ts       # API client
│       │   │   └── supabase.ts  # Supabase client
│       │   ├── pages/           # Page components
│       │   │   ├── Login.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Accounts.tsx
│       │   │   ├── Transactions.tsx
│       │   │   ├── Import.tsx
│       │   │   ├── Classify.tsx
│       │   │   └── Transfers.tsx
│       │   ├── App.tsx          # Main app component
│       │   ├── main.tsx         # Entry point
│       │   └── index.css        # Global styles
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── package.json
│
├── .env.example                 # Environment variables template
├── .gitignore
├── .replit                      # Replit configuration
├── replit.nix                   # Replit dependencies
├── docker-compose.yml           # Local Docker setup
├── package.json                 # Root package.json
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

## 📚 API Documentation

### Authentication

#### POST `/api/auth/signup`
Register a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "John Doe"
}
```

#### POST `/api/auth/signin`
Sign in existing user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/me`
Get current user info (requires auth token).

### Accounts

#### GET `/api/accounts`
Get all user accounts.

#### POST `/api/accounts`
Create a new account.

**Request**:
```json
{
  "name": "Main Checking",
  "account_type": "checking",
  "currency": "USD",
  "initial_balance": 1000.00,
  "institution": "Bank Name"
}
```

### Transactions

#### GET `/api/transactions`
Get transactions with optional filters.

**Query Parameters**:
- `account_id`: Filter by account
- `category_id`: Filter by category
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `search`: Search in description/merchant
- `limit`: Results per page (default: 100)
- `offset`: Pagination offset

#### POST `/api/transactions`
Create a new transaction.

#### POST `/api/transactions/classify/batch`
Trigger batch classification.

**Request**:
```json
{
  "transaction_ids": ["id1", "id2", "id3"]
}
```

### Imports

#### POST `/api/imports/upload`
Upload CSV/XLSX file.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "job": { "id": "...", "status": "mapping" },
  "headers": ["Date", "Description", "Amount"],
  "preview": [...],
  "suggestions": [...]
}
```

#### POST `/api/imports/:id/mapping`
Set column mapping.

#### POST `/api/imports/:id/execute`
Execute import.

### Dashboard

#### GET `/api/dashboard/summary`
Get dashboard summary.

**Query**: `?currency=USD`

#### GET `/api/dashboard/spending-by-category`
Get spending breakdown.

**Query**: `?currency=USD&start_date=2025-01-01&end_date=2025-01-31`

#### GET `/api/dashboard/cash-flow`
Get cash flow data.

**Query**: `?currency=USD&period=daily&start_date=2025-01-01`

### Foreign Exchange

#### GET `/api/fx/rate`
Get exchange rate.

**Query**: `?from=USD&to=EUR&date=2025-01-01`

#### GET `/api/fx/convert`
Convert amount.

**Query**: `?amount=100&from=USD&to=EUR`

## 🔐 Security

- **Row Level Security (RLS)**: All database tables use RLS policies
- **JWT Authentication**: All API endpoints (except auth) require valid JWT
- **Environment Variables**: Sensitive data stored in environment variables
- **SQL Injection Protection**: Parameterized queries via Supabase
- **CORS**: Configured for specific frontend origin

## 🆕 What's New in Version 2.0

### October 2025 - Premium Edition Release

#### 🐛 **Critical Bug Fixes**
- ✅ **Import Date Parsing**: Fixed "zone displacement out of range" error in Excel/CSV imports
  - Enhanced date parsing with timezone safety
  - Added year validation (1900-2100)
  - Robust error handling with graceful fallbacks

#### ✨ **New Features**

**Transaction & Account Editing**
- Full PATCH APIs for transactions and accounts
- Comprehensive Zod validation
- Edit all fields: date, amount, category, description, currency
- Account ownership verification

**Custom Category Management**
- Create, update, and delete custom categories
- Hierarchical category support (parent/child)
- System category protection
- Transaction usage validation before deletion

**Advanced Analytics**
- `/api/dashboard/spending-over-time`: Daily/Weekly/Monthly trends
- `/api/dashboard/year-over-year`: Current vs last year comparison
- `/api/dashboard/category-breakdown`: Hierarchical spending analysis
- Multi-currency support with FX conversion
- Flexible date range and account/category filters

**Premium UI Components**
- Modern gradient-based design system
- Reusable component library (Button, Card, Input, Modal)
- Smooth animations with Tailwind CSS
- Accessibility-first approach (WCAG AA compliant)

#### 📚 **Documentation**
- See `REFACTOR_SUMMARY.md` for complete technical details
- See `FRONTEND_IMPLEMENTATION_GUIDE.md` for UI component templates

## 🎯 Next Steps / Roadmap

- [x] ~~Custom category management~~ **✅ Completed**
- [x] ~~Transaction editing~~ **✅ Completed**
- [x] ~~Account editing~~ **✅ Completed**
- [x] ~~Advanced analytics dashboards~~ **✅ Completed**
- [ ] Recurring transaction auto-detection
- [ ] Budget management and alerts
- [ ] PDF export for reports
- [ ] Mobile responsive improvements
- [ ] Multi-user collaboration
- [ ] GraphQL API option
- [ ] Advanced filtering and search
- [ ] Expense splitting
- [ ] Receipt photo uploads

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## 🙏 Acknowledgments

- Supabase for backend infrastructure
- DeepSeek for LLM capabilities
- ExchangeRate.host for FX data
- The open-source community

---

**Built with ❤️ by Claude**
