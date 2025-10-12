# 🚀 Quick Start Guide

Get the expense tracker running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Supabase account ([sign up free](https://supabase.com))
- DeepSeek API key ([get free key](https://platform.deepseek.com))

## Step 1: Clone & Install (2 min)

```bash
git clone <your-repo-url>
cd supply-control-tower
npm install
```

## Step 2: Set Up Supabase (2 min)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project (wait for setup to complete)
3. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

4. Go to **SQL Editor** and run these migrations in order:
   - Copy contents of `packages/backend/migrations/001_initial_schema.sql` → Execute
   - Copy contents of `packages/backend/migrations/002_seed_system_categories.sql` → Execute
   - Copy contents of `packages/backend/migrations/003_seed_merchant_data.sql` → Execute

## Step 3: Configure Environment (1 min)

Create `.env` file in root directory:

```bash
# Supabase
SUPABASE_URL=<your-project-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# DeepSeek (get from https://platform.deepseek.com)
DEEPSEEK_API_KEY=<your-deepseek-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# App Config (use defaults)
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
FX_PROVIDER_URL=https://api.exchangerate.host
```

Create `packages/frontend/.env`:

```bash
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=http://localhost:3001
```

## Step 4: Seed Demo Data (30 sec)

```bash
npm run db:seed
```

This creates:
- Demo user: `demo@example.com` / `demo123456`
- 3 sample accounts
- 15+ sample transactions

## Step 5: Run the App! (10 sec)

```bash
npm run dev
```

Open **http://localhost:3000** and log in with:
- **Email**: demo@example.com
- **Password**: demo123456

## 🎉 You're Done!

### What to Try Next

1. **Dashboard**: View your sample transactions and spending charts
2. **Import**: Upload a CSV file with your transactions
3. **Classify**: See AI categorization in action
4. **Accounts**: Add your own accounts
5. **Transfers**: Link transactions between accounts

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists with all required variables
- Verify Supabase credentials are correct
- Make sure port 3001 is available

### Frontend won't start
- Check `packages/frontend/.env` exists
- Verify Supabase URL and anon key
- Make sure port 3000 is available

### Database errors
- Ensure all 3 migration files were run in Supabase SQL Editor
- Check Supabase project is active (not paused)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key

### Authentication errors
- Clear browser cookies/localStorage
- Check Supabase Auth settings allow email/password
- Verify Site URL in Supabase includes `http://localhost:3000`

### LLM classification not working
- Verify `DEEPSEEK_API_KEY` is valid
- Check DeepSeek account has credits
- LLM is optional - rule-based fallback will work without it

## 📚 Next Steps

Read the full [README.md](./README.md) for:
- Complete API documentation
- Deployment instructions
- Architecture details
- Advanced features

## 🆘 Need Help?

1. Check the [README.md](./README.md)
2. Review error messages carefully
3. Open an issue on GitHub

---

Happy expense tracking! 💰
