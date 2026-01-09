# Quick Start Guide - Inbox Mind 🚀

**Estimated Setup Time:** 15-20 minutes

---

## 📋 PREREQUISITES

Before starting, make sure you have installed:

1. **Node.js** (v18 or later)

   ```bash
   node --version  # Should be v18.x or higher
   ```

2. **pnpm** (Package Manager)

   ```bash
   npm install -g pnpm
   pnpm --version  # Should be v8.x or higher
   ```

3. **PostgreSQL** (v12 or later)

   ```bash
   psql --version  # Should be v12 or higher
   ```

4. **Git**
   ```bash
   git --version
   ```

---

## 🎯 STEP-BY-STEP SETUP

### Step 1: Clone Repository

```bash
# Clone the project
git clone https://github.com/TQTuyen/Inbox-Mind.git
cd Inbox-Mind

# Check you're in the right directory
ls  # Should see: apps/, package.json, etc.
```

---

### Step 2: Install Dependencies

```bash
# Install all dependencies (takes 2-3 minutes)
pnpm install
```

**Expected Output:**

```
Progress: resolved 1500, reused 1450, downloaded 50
✓ Dependencies installed successfully
```

---

### Step 3: Setup Database

#### 3.1. Create Database

```bash
# On Windows (PowerShell):
psql -U postgres
CREATE DATABASE inbox_mind;
\q

# On Mac/Linux:
createdb inbox_mind

# Verify database created:
psql -U postgres -l | grep inbox_mind
```

#### 3.2. Enable pgvector Extension

```bash
# Connect to database
psql -U postgres -d inbox_mind

# Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

# Verify extension
\dx  # Should show 'vector' in the list

# Exit
\q
```

---

### Step 4: Configure Backend Environment

#### 4.1. Create Backend .env File

```bash
# Copy example environment file
cp apps/backend/.env.example apps/backend/.env

# Or on Windows:
copy apps\backend\.env.example apps\backend\.env
```

#### 4.2. Get Google OAuth Credentials

**Follow these steps to get credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**:
   - Search for "Gmail API"
   - Click "Enable"
4. Create **OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "+ CREATE CREDENTIALS" > "OAuth client ID"
   - Application type: **Web application**
   - Name: **Inbox Mind**
   - Authorized JavaScript origins:
     ```
     http://localhost:4200
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/v1/auth/google/callback
     ```
   - Click "CREATE"
5. Copy **Client ID** and **Client Secret**

#### 4.3. Generate Security Keys

```bash
# Generate JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4.4. Edit Backend .env File

Open `apps/backend/.env` and fill in:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=inbox_mind

# Google OAuth (from Step 4.2)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# JWT Configuration (from Step 4.3)
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption (from Step 4.3)
ENCRYPTION_KEY=your_generated_encryption_key_here

# Google Gemini API (for AI features)
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

**Note:** To get Google Gemini API key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Create new or use existing API key

---

### Step 5: Configure Frontend Environment

```bash
# Create frontend .env file
echo "VITE_USE_MOCK=false" > apps/frontend/.env

# Or on Windows:
echo VITE_USE_MOCK=false > apps\frontend\.env
```

**Frontend .env content:**

```env
# Use real backend API (not mock data)
VITE_USE_MOCK=false

# Backend API URL (optional, defaults to http://localhost:3000)
VITE_API_URL=http://localhost:3000/api/v1
```

---

### Step 6: Run Database Migrations

```bash
# Run migrations to create tables
pnpm nx run backend:migration:run

# Or alternatively:
cd apps/backend
npm run migration:run
cd ../..
```

**Expected Output:**

```
query: CREATE TABLE "users" ...
query: CREATE TABLE "email_metadata" ...
query: CREATE TABLE "email_embeddings" ...
query: CREATE TABLE "kanban_config" ...
query: CREATE TABLE "search_history" ...
✓ Migrations executed successfully
```

---

### Step 7: Start the Application

#### Option 1: Start Everything Together (Recommended)

```bash
# Start both frontend and backend
pnpm start
```

**Expected Output:**

```
✓ Backend started at http://localhost:3000
✓ Frontend started at http://localhost:4200

Ready in 5s
```

#### Option 2: Start Separately (for debugging)

**Terminal 1 - Backend:**

```bash
pnpm nx serve backend
# Or: pnpm be:run
```

**Terminal 2 - Frontend:**

```bash
pnpm nx serve frontend
# Or: pnpm fe:run
```

---

### Step 8: Verify Setup

#### 8.1. Check Backend

Open browser: http://localhost:3000/api/v1/

**Expected:** Should see API is running

#### 8.2. Check Frontend

Open browser: http://localhost:4200

**Expected:** Should see Inbox Mind login page

#### 8.3. Test Login

1. Click "Login with Google"
2. Choose your Google account
3. Grant Gmail permissions
4. **Success!** You should see your inbox

---

## 🎯 QUICK COMMANDS

### Development

```bash
# Start both frontend and backend
pnpm start

# Start backend only
pnpm be:run

# Start frontend only
pnpm fe:run

# Run backend in watch mode
pnpm nx serve backend --watch
```

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
pnpm nx test backend

# Run frontend tests only
pnpm nx test frontend

# Run tests in watch mode
pnpm nx test backend --watch
```

### Linting & Formatting

```bash
# Lint all code
pnpm lint

# Lint backend
pnpm nx lint backend

# Lint frontend
pnpm nx lint frontend

# Fix linting issues
pnpm nx lint backend --fix
pnpm nx lint frontend --fix
```

### Build

```bash
# Build all apps
pnpm build

# Build backend only
pnpm nx build backend

# Build frontend only
pnpm nx build frontend
```

### Database

```bash
# Run migrations
pnpm nx run backend:migration:run

# Revert last migration
pnpm nx run backend:migration:revert

# Generate new migration
pnpm nx run backend:migration:generate --name=MigrationName

# Show migration status
pnpm nx run backend:migration:show
```

---

## 🐛 TROUBLESHOOTING

### Issue 1: "Cannot find module '@google/generative-ai'"

**Solution:**

```bash
cd apps/backend
pnpm add @google/generative-ai
cd ../..
```

### Issue 2: "Port 3000 is already in use"

**Solution:**

```bash
# Find process using port 3000
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### Issue 3: "Database connection failed"

**Solution:**

1. Check PostgreSQL is running:

   ```bash
   # Windows: Check Services for PostgreSQL
   # Mac: brew services list
   # Linux: sudo systemctl status postgresql
   ```

2. Verify credentials in `.env` file
3. Test connection:
   ```bash
   psql -U postgres -d inbox_mind
   ```

### Issue 4: "Migration failed"

**Solution:**

```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE inbox_mind;
CREATE DATABASE inbox_mind;
\c inbox_mind
CREATE EXTENSION IF NOT EXISTS vector;
\q

# Run migrations again
pnpm nx run backend:migration:run
```

### Issue 5: "Google OAuth Error: redirect_uri_mismatch"

**Solution:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: Credentials > OAuth 2.0 Client IDs
3. Add exact redirect URI:
   ```
   http://localhost:3000/api/v1/auth/google/callback
   ```
4. Save and try again

### Issue 6: "pnpm: command not found"

**Solution:**

```bash
npm install -g pnpm
```

### Issue 7: "pgvector extension not found"

**Solution:**

```bash
# Install pgvector
# On Mac:
brew install pgvector

# On Ubuntu/Debian:
sudo apt-get install postgresql-15-pgvector

# On Windows: Download from https://github.com/pgvector/pgvector/releases

# Then enable in database:
psql -U postgres -d inbox_mind -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## 📝 VERIFICATION CHECKLIST

Before starting development, verify:

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] PostgreSQL installed and running
- [ ] Database `inbox_mind` created
- [ ] pgvector extension enabled
- [ ] Backend .env file configured
- [ ] Frontend .env file configured
- [ ] Google OAuth credentials obtained
- [ ] Gemini API key obtained
- [ ] Migrations executed successfully
- [ ] Backend starts without errors (port 3000)
- [ ] Frontend starts without errors (port 4200)
- [ ] Can login with Google
- [ ] Can see Gmail inbox

---

## 🎓 NEXT STEPS

After successful setup:

1. **Explore Features:**

   - Login with Google
   - View your Gmail inbox
   - Try semantic search
   - Create Kanban columns
   - Drag emails to different columns
   - Snooze emails

2. **Read Documentation:**

   - `API_DOCUMENTATION.md` - API endpoints
   - `WEEK4_TESTING_GUIDE.md` - Testing procedures
   - `README.md` - Project overview

3. **Development:**
   - Backend code: `apps/backend/src/`
   - Frontend code: `apps/frontend/src/`
   - Add new features
   - Write tests

---

## 🚀 PRODUCTION DEPLOYMENT

For production deployment, see:

- **Frontend:** Vercel (automatic from GitHub)
- **Backend:** Render, Railway, or Cloud Run
- **Database:** Supabase, Neon, or managed PostgreSQL

**Deployment Guide:** See `README.md` section "Deployment"

---

## 📞 GET HELP

If you encounter issues:

1. **Check logs:**

   - Backend: Terminal running `pnpm be:run`
   - Frontend: Browser console (F12)
   - Database: `tail -f /var/log/postgresql/postgresql.log`

2. **Common files to check:**

   - `apps/backend/.env` - Backend configuration
   - `apps/frontend/.env` - Frontend configuration
   - `apps/backend/src/main.ts` - Backend entry point
   - `apps/frontend/src/main.tsx` - Frontend entry point

3. **Useful commands:**

   ```bash
   # Check backend is running
   curl http://localhost:3000/api/v1/

   # Check database connection
   psql -U postgres -d inbox_mind -c "SELECT 1;"

   # View backend logs
   pnpm nx serve backend --verbose
   ```

---

**Setup Time:** ~15-20 minutes
**Last Updated:** December 24, 2024

**Happy Coding!** 🚀
