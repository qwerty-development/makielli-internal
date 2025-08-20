# Claude AI Instructions for Makielli Internal Project

## 🗃️ Project Overview

This is a Next.js business management system for Makielli Internal with Supabase backend for:
- Client management and invoicing
- Product inventory and variants
- Quotations and order processing
- Supplier management
- Financial tracking and reporting

## 🏗️ Database Architecture

### Core Tables
- `Clients` - Customer management with groups and balances
- `Products` - Product catalog with variants (color, size, quantity)
- `ProductVariants` - Size/color variations with stock quantities
- `ProductHistory` - Complete audit trail of inventory changes
- `Quotations` - Sales quotes and proposals
- `ClientInvoices` - Billing and payment tracking
- `Suppliers` - Vendor management
- `SupplierInvoices` - Purchase orders and costs
- `companies` - Company information for legal entities

### Key Views
- `product_inventory_summary` - Real-time stock levels
- `product_sales_history` - Sales analytics with client data
- `client_balance_analysis` - Financial overview per client

### Important Functions
- `get_product_sales()` - Sales analytics by date range
- `get_low_stock_products()` - Inventory alerts
- `get_sales_kpis()` - Business performance metrics
- `calculate_client_balance()` - Financial calculations

## 🛠️ Supabase CLI Workflow

### ALWAYS Use Supabase CLI for Database Operations

**Never use raw SQL commands or manual database editing.** Always use the established CLI workflow.

### Project Configuration
- **Project ID**: `mzahpiboezkzqatgfnmo` (Makielli Internal)
- **Local Studio**: http://127.0.0.1:54323
- **Local API**: http://127.0.0.1:54321
- **Types file**: `types/supabase-generated.ts`

### NPM Scripts Available
```json
{
  "supabase:start": "npx supabase start",
  "supabase:stop": "npx supabase stop", 
  "supabase:status": "npx supabase status",
  "supabase:reset": "npx supabase db reset",
  "supabase:migrate": "npx supabase db push",
  "supabase:pull": "npx supabase db pull",
  "supabase:diff": "npx supabase db diff",
  "supabase:gen-types": "npx supabase gen types typescript --local > types/supabase-generated.ts"
}
```

## 📋 Standard Operating Procedures

### When Starting Database Work
1. **ALWAYS start with**: `npm run supabase:status` to check if services are running
2. **If not running**: `npm run supabase:start` (may take 5-10 minutes first time)
3. **Check sync**: `npm run supabase:diff` (should show "No schema changes found")
4. **If out of sync**: `npm run supabase:pull` then `npm run supabase:reset`

### Making Schema Changes
1. **Never edit production directly** - always work locally first
2. **Make changes via Studio**: http://127.0.0.1:54323
3. **Check changes**: `npm run supabase:diff`
4. **Create migration**: `npx supabase migration new descriptive_name`
5. **Test locally**: `npm run supabase:reset`
6. **Deploy to production**: `npm run supabase:migrate`
7. **Update types**: `npm run supabase:gen-types`

### Data Management
- **Real data is synced** from production via `supabase/seed.sql`
- **To refresh data**: `npx supabase db dump --data-only --file supabase/seed.sql` then `npm run supabase:reset`
- **Never use dummy/fake data** - always work with real production data locally

### Type Safety
- **Always regenerate types** after schema changes: `npm run supabase:gen-types`
- **Import types from**: `types/supabase-generated.ts`
- **Use proper type annotations** for all database operations

## 🚨 Critical Rules

### Database Operations
- ✅ **DO**: Use Supabase CLI for all database operations
- ✅ **DO**: Test changes locally before production deployment
- ✅ **DO**: Create descriptive migration names
- ✅ **DO**: Always check `npm run supabase:diff` before deploying
- ❌ **DON'T**: Make direct production database changes
- ❌ **DON'T**: Skip creating migrations for schema changes
- ❌ **DON'T**: Use dummy data - always work with real data

### Development Workflow
- ✅ **DO**: Start each session with `npm run supabase:status`
- ✅ **DO**: Pull remote changes before starting: `npm run supabase:pull`
- ✅ **DO**: Verify sync with `npm run supabase:diff`
- ✅ **DO**: Generate fresh types after any schema changes
- ❌ **DON'T**: Assume services are running
- ❌ **DON'T**: Work with stale data

### Code Standards
- ✅ **DO**: Use TypeScript types from `types/supabase-generated.ts`
- ✅ **DO**: Follow existing code patterns and conventions
- ✅ **DO**: Handle errors properly in database operations
- ❌ **DON'T**: Use `any` types for database operations
- ❌ **DON'T**: Ignore TypeScript errors

## 🔧 Troubleshooting Checklist

### If Commands Fail
1. **Check Docker**: Ensure Docker Desktop is running
2. **Check authentication**: `npx supabase projects list`
3. **Check project link**: Should show project `mzahpiboezkzqatgfnmo`
4. **Restart services**: `npm run supabase:stop` then `npm run supabase:start`

### If Data is Missing
1. **Re-import real data**: 
   ```bash
   npx supabase db dump --data-only --file supabase/seed.sql
   npm run supabase:reset
   ```

### If Schema is Out of Sync
1. **Pull and reset**:
   ```bash
   npm run supabase:pull
   npm run supabase:reset
   npm run supabase:diff  # Should show "No schema changes found"
   ```

### If Types are Wrong
1. **Regenerate types**: `npm run supabase:gen-types`
2. **Check file exists**: `types/supabase-generated.ts`

## 📁 File Locations

### Important Files
- `types/supabase-generated.ts` - Auto-generated TypeScript types
- `supabase/config.toml` - Configuration synced with remote
- `supabase/migrations/` - Database migration files
- `supabase/seed.sql` - Real data from production
- `SUPABASE_CLI_COMPLETE_SETUP_GUIDE.md` - Complete setup instructions

### Configuration Files
- `package.json` - Contains all Supabase CLI scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration

## 🎯 Common Tasks

### Adding a New Table
1. Create via Studio: http://127.0.0.1:54323
2. Add appropriate columns, constraints, and RLS policies
3. Check changes: `npm run supabase:diff`
4. Create migration: `npx supabase migration new add_[table_name]_table`
5. Test: `npm run supabase:reset`
6. Deploy: `npm run supabase:migrate`
7. Update types: `npm run supabase:gen-types`

### Modifying Existing Table
1. Modify via Studio: http://127.0.0.1:54323
2. Check changes: `npm run supabase:diff`
3. Create migration: `npx supabase migration new update_[table_name]_[change]`
4. Test: `npm run supabase:reset`
5. Deploy: `npm run supabase:migrate`
6. Update types: `npm run supabase:gen-types`

### Adding Database Function
1. Create via Studio SQL editor
2. Test function locally
3. Follow migration workflow above
4. Update types to include function signatures

### Working with Real Data
- Local environment has complete production data
- Use Studio to browse and test with real data
- Safe to experiment locally - data resets with `npm run supabase:reset`

## 🔑 Local Development Keys

```bash
# Local API URL
http://127.0.0.1:54321

# Local Anonymous Key
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Local Service Role Key  
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## 💡 Quick Commands Reference

### Daily Start
```bash
npm run supabase:status    # Check if running
npm run supabase:start     # Start if needed
npm run supabase:diff      # Verify sync
```

### Schema Work
```bash
npm run supabase:diff                              # Check changes
npx supabase migration new descriptive_name       # Create migration
npm run supabase:reset                            # Test locally
npm run supabase:migrate                          # Deploy to production
npm run supabase:gen-types                        # Update types
```

### Data Refresh
```bash
npx supabase db dump --data-only --file supabase/seed.sql
npm run supabase:reset
```

### Emergency Reset
```bash
npm run supabase:stop
npm run supabase:pull
npm run supabase:reset
npm run supabase:gen-types
```

## 🎖️ Success Verification

Before considering any database task complete:
- [ ] `npm run supabase:status` shows all services running
- [ ] `npm run supabase:diff` shows "No schema changes found"
- [ ] `types/supabase-generated.ts` is up to date
- [ ] Studio accessible at http://127.0.0.1:54323
- [ ] Changes tested locally with real data
- [ ] Migration created and applied successfully

---

**Remember: This project uses REAL production data locally. Always follow the CLI workflow and never skip the verification steps.**