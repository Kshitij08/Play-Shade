# Database Setup Guide

This guide will help you switch from the old database to your own PostgreSQL database.

## 📋 Prerequisites

- A PostgreSQL database (see options below)
- Node.js and pnpm installed

## 🗄️ Step 1: Get Your Database

Choose one of these options:

### Option A: Vercel Postgres (Recommended)
1. Visit [vercel.com](https://vercel.com) and sign in
2. Go to your project or create a new one
3. Navigate to **Storage** tab → **Create Database** → **Postgres**
4. Once created, go to the **.env.local** tab
5. Copy the `POSTGRES_URL` value

### Option B: Supabase (Free Tier)
1. Visit [supabase.com](https://supabase.com) and sign in
2. Create a new project
3. Go to **Project Settings** → **Database**
4. Copy the **Connection pooling** URL (Transaction mode)
5. Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### Option C: Neon (Serverless Postgres)
1. Visit [neon.tech](https://neon.tech) and sign in
2. Create a new project
3. Copy the connection string from the dashboard
4. Format: `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`

### Option D: Local PostgreSQL
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb minicolors

# Connection string
postgresql://postgres:password@localhost:5432/minicolors
```

## ⚙️ Step 2: Configure Environment

1. Open `.env.local` file in the project root
2. Replace the `DB_URL` with your connection string:

```env
DB_URL=postgresql://your-actual-connection-string-here
```

**Example:**
```env
DB_URL=postgres://default:abc123@ep-cool-sound-123456.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require
```

## 🔧 Step 3: Run Database Migrations

This will create all the necessary tables in your database:

```bash
# Install dependencies (if not done already)
pnpm install

# Push the database schema
pnpm drizzle-kit push

# Or generate and run migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## 🧪 Step 4: Verify Connection

Test if the connection works:

```bash
# Start the development server
pnpm dev

# The server should start without database errors
# Check the console for any connection issues
```

## 📊 Database Tables Created

After migration, your database will have these tables:

1. **daily_attempts** - Stores all game attempts
   - User scores, similarity, time taken
   - Streak information
   - Game type (color-mixing or finding)

2. **leaderboard** - Best scores per user per day
   - Daily rankings
   - User scores and times

3. **notification_details** - User notification preferences
   - Farcaster notification tokens

## 🔍 Verify Data

You can check if tables were created:

### Using Drizzle Studio (Recommended)
```bash
pnpm drizzle-kit studio
```
This opens a web UI at `https://local.drizzle.studio`

### Using psql (CLI)
```bash
# Connect to database
psql "your-connection-string"

# List tables
\dt

# View table structure
\d daily_attempts
\d leaderboard
\d notification_details
```

## 🚀 Deploy to Production

If deploying to Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `DB_URL` with your production database URL
4. Redeploy your application

## ⚠️ Important Notes

- **Never commit `.env.local`** to git (already in .gitignore)
- Keep your database credentials secure
- Use different databases for development and production
- The old database data will NOT be migrated automatically
- All user scores will start fresh in your new database

## 🔄 Migrating Old Data (Optional)

If you need to migrate data from the old database:

1. Export data from old database:
```bash
pg_dump old-db-url > old-data.sql
```

2. Import to new database:
```bash
psql new-db-url < old-data.sql
```

Or contact me if you need help with data migration!

## 🐛 Troubleshooting

### Connection Issues
- Check if `DB_URL` is correctly set in `.env.local`
- Verify database credentials
- Check if IP address is whitelisted (for cloud databases)
- Ensure SSL mode is correct (add `?sslmode=require` if needed)

### Migration Errors
```bash
# Reset and try again
pnpm drizzle-kit drop
pnpm drizzle-kit push
```

### Permission Errors
- Ensure database user has CREATE TABLE permissions
- Check if database exists

## 📚 Additional Commands

```bash
# View current database schema
pnpm drizzle-kit introspect

# Generate SQL migrations
pnpm drizzle-kit generate

# Open Drizzle Studio (Database GUI)
pnpm drizzle-kit studio
```

## ✅ Checklist

- [ ] Created PostgreSQL database
- [ ] Added `DB_URL` to `.env.local`
- [ ] Ran `pnpm drizzle-kit push`
- [ ] Verified tables were created
- [ ] Tested the application locally
- [ ] Added production `DB_URL` to Vercel (if deploying)

---

Need help? Check the [Drizzle ORM docs](https://orm.drizzle.team/) or create an issue!
