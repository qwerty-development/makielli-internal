# 🚀 Complete Supabase CLI Setup Guide

**A comprehensive guide to set up Supabase CLI with schema sync, real data, and local development environment.**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Verification](#verification)
4. [Daily Workflow](#daily-workflow)
5. [Troubleshooting](#troubleshooting)
6. [Command Reference](#command-reference)

---

## 🔧 Prerequisites

### Required Software
- ✅ **Docker Desktop** - Must be installed and running
- ✅ **Node.js** - For npm commands
- ✅ **Git** - For version control
- ✅ **Existing Supabase Project** - Remote instance already set up

### Project Requirements
- Next.js/React project
- Existing Supabase configuration

---

## 🚀 Step-by-Step Setup

### Step 1: Add NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "supabase:start": "npx supabase start",
    "supabase:stop": "npx supabase stop",
    "supabase:status": "npx supabase status",
    "supabase:reset": "npx supabase db reset",
    "supabase:migrate": "npx supabase db push",
    "supabase:pull": "npx supabase db pull",
    "supabase:diff": "npx supabase db diff",
    "supabase:gen-types": "npx supabase gen types typescript --local > types/supabase-generated.ts",
    "supabase:functions:serve": "npx supabase functions serve",
    "supabase:functions:deploy": "npx supabase functions deploy"
  }
}
```

### Step 2: Check Docker Status

```bash
# Ensure Docker Desktop is running
docker info
```

If Docker isn't running, start Docker Desktop and wait for it to fully initialize.

### Step 3: Authenticate with Supabase

```bash
# Login to your Supabase account (opens browser)
npx supabase login
```

### Step 4: Verify Authentication

```bash
# List your projects to confirm authentication
npx supabase projects list
```

You should see your projects listed with their project IDs.

### Step 5: Link to Your Project

Find your project ID from the list above, then link:

```bash
# Replace PROJECT_ID with your actual project ID
npx supabase link --project-ref PROJECT_ID
```

**Example:**
```bash
npx supabase link --project-ref mzahpiboezkzqatgfnmo
```

### Step 6: Pull Remote Schema

```bash
# Pull complete schema from remote database
npm run supabase:pull
```

This creates migration files with your complete schema.

### Step 7: Start Local Development Environment

```bash
# Start local Supabase stack (this may take 5-10 minutes first time)
npm run supabase:start
```

**What this starts:**
- PostgreSQL database (localhost:54322)
- Supabase Studio (http://127.0.0.1:54323)
- API server (http://127.0.0.1:54321)
- Email testing (http://127.0.0.1:54324)

### Step 8: Import Real Data

```bash
# Export real data from remote database
npx supabase db dump --data-only --file supabase/seed.sql

# Reset local database with real data
npm run supabase:reset
```

### Step 9: Generate TypeScript Types

```bash
# Create types directory if it doesn't exist
mkdir -p types

# Generate types from local database
npm run supabase:gen-types
```

### Step 10: Verify Everything Works

```bash
# Check status of all services
npm run supabase:status

# Verify sync between local and remote
npm run supabase:diff
```

**Expected output:** `No schema changes found` ✅

---

## ✅ Verification

### 1. Check Services Status
```bash
npm run supabase:status
```

Should show all services running with URLs.

### 2. Test API Access
```bash
# Test local API (replace with your table name)
curl "http://127.0.0.1:54321/rest/v1/Clients?limit=3" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

### 3. Open Studio
Navigate to http://127.0.0.1:54323 and verify you can see your tables and data.

### 4. Check Types File
Verify `types/supabase-generated.ts` exists and contains your table definitions.

---

## 🔄 Daily Workflow

### Starting Development
```bash
# 1. Start Docker Desktop
# 2. Pull any remote changes
npm run supabase:pull

# 3. Start local services
npm run supabase:start

# 4. Generate fresh types if schema changed
npm run supabase:gen-types
```

### Making Database Changes
```bash
# 1. Make changes locally via Studio (http://127.0.0.1:54323)

# 2. Check what changed
npm run supabase:diff

# 3. Create migration file
npx supabase migration new descriptive_change_name

# 4. Deploy to production
npm run supabase:migrate

# 5. Update types
npm run supabase:gen-types
```

### Ending Development
```bash
# Stop local services
npm run supabase:stop
```

---

## 🔧 Troubleshooting

### Docker Issues

**Problem:** `Docker not running`
```bash
# Solution: Start Docker Desktop and wait for it to fully start
# Check with:
docker info
```

**Problem:** `Port already in use`
```bash
# Solution: Stop all services and restart
npm run supabase:stop
npm run supabase:start
```

### Schema Sync Issues

**Problem:** Local and remote out of sync
```bash
# Solution: Pull latest and reset
npm run supabase:pull
npm run supabase:reset
npm run supabase:diff  # Should show "No schema changes found"
```

### Authentication Issues

**Problem:** `Access token not provided`
```bash
# Solution: Re-authenticate
npx supabase login
```

### Data Issues

**Problem:** No data in local database
```bash
# Solution: Re-import real data
npx supabase db dump --data-only --file supabase/seed.sql
npm run supabase:reset
```

### Type Generation Issues

**Problem:** Types not matching schema
```bash
# Solution: Regenerate types
npm run supabase:gen-types
```

---

## 📖 Command Reference

### Essential Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run supabase:start` | Start local development stack | Beginning of dev session |
| `npm run supabase:stop` | Stop local services | End of dev session |
| `npm run supabase:status` | Check service status | Troubleshooting |
| `npm run supabase:pull` | Pull remote schema | Sync with remote changes |
| `npm run supabase:reset` | Reset local database | Apply migrations fresh |
| `npm run supabase:diff` | Compare local vs remote | Before deploying changes |
| `npm run supabase:migrate` | Deploy local changes to remote | Push to production |
| `npm run supabase:gen-types` | Generate TypeScript types | After schema changes |

### Advanced Commands

| Command | Purpose |
|---------|---------|
| `npx supabase migration new [name]` | Create new migration file |
| `npx supabase db dump --data-only --file supabase/seed.sql` | Export real data |
| `npx supabase gen types typescript --project-id [id] > types/remote.ts` | Generate types from remote |
| `npx supabase functions new [name]` | Create new Edge Function |
| `npx supabase functions deploy` | Deploy Edge Functions |

### Service URLs (when running locally)

| Service | URL | Purpose |
|---------|-----|---------|
| **Supabase Studio** | http://127.0.0.1:54323 | Database management UI |
| **API Endpoint** | http://127.0.0.1:54321 | REST/GraphQL API |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres | Direct DB access |
| **Email Testing** | http://127.0.0.1:54324 | Test email delivery |

### Local API Keys

```bash
# Anonymous Key (for client-side)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Service Role Key (for server-side)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

---

## 🎯 Key Benefits

✅ **Complete Local Development** - Full Supabase stack running locally  
✅ **Real Data** - Work with actual production data safely  
✅ **Schema Management** - Version-controlled database changes  
✅ **Type Safety** - Auto-generated TypeScript types  
✅ **Safe Testing** - Test changes locally before deploying  
✅ **Team Collaboration** - Shared development environment  

---

## 📁 Project Structure

After setup, your project will have:

```
project-root/
├── supabase/
│   ├── config.toml              # Configuration synced with remote
│   ├── migrations/              # Database migration files
│   │   └── [timestamp]_remote_schema.sql
│   ├── functions/               # Edge Functions (if any)
│   └── seed.sql                 # Real data from remote
├── types/
│   └── supabase-generated.ts    # Auto-generated TypeScript types
└── package.json                 # With Supabase CLI scripts
```

---

## ⚠️ Important Notes

### DO:
- Always test changes locally first
- Create descriptive migration names
- Pull remote changes before starting work
- Commit migration files with related code changes

### DON'T:
- Make changes directly in production
- Skip creating migrations for schema changes
- Push code without testing locally
- Ignore `npm run supabase:diff` output

---

## 🆘 Emergency Commands

### Complete Reset
```bash
# If everything breaks, nuclear option:
npm run supabase:stop
docker system prune -f
npm run supabase:start
npm run supabase:pull
npm run supabase:reset
```

### Data Recovery
```bash
# Re-import fresh data from remote:
npx supabase db dump --data-only --file supabase/seed.sql
npm run supabase:reset
```

---

## ✨ Success Checklist

After completing this guide, you should have:

- [ ] NPM scripts configured in `package.json`
- [ ] Docker Desktop running
- [ ] Supabase CLI authenticated
- [ ] Project linked to remote Supabase instance
- [ ] Local services running (`npm run supabase:status` shows all green)
- [ ] Real data imported locally
- [ ] TypeScript types generated
- [ ] Studio accessible at http://127.0.0.1:54323
- [ ] `npm run supabase:diff` shows "No schema changes found"

---

**🎉 You're now ready for professional Supabase development with local environment, real data, and full type safety!**

---

*For support, refer to the [official Supabase CLI documentation](https://supabase.com/docs/guides/cli) or create an issue in your project repository.*