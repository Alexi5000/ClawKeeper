# ClawKeeper Startup Guide

## 🚀 Quick Start (3 Steps)

### 1. Start Database
```bash
# PostgreSQL should be running in Docker
docker ps | grep postgres

# If not running, start it:
docker start techtide-postgres
```

### 2. Start API Server
```bash
# In Terminal 1
cd c:\TechTide\Apps\Clawkeeper
bun run dev
```

**Expected output:**
```
🔍 Validating ClawKeeper Configuration...
✅ Configuration valid
   API Port:       4004
   Dashboard Port: 5174
   Database:       PostgreSQL on localhost:5432

╔═════════════════════════════════════════════════════════════════╗
║  🔐 ClawKeeper API Server                                       ║
╚═════════════════════════════════════════════════════════════════╝

Port:        4004
Environment: development
Database:    Connected
JWT Secret:  Configured

Health:      http://localhost:4004/health
API:         http://localhost:4004/api
Dashboard:   http://localhost:5174

Ready for requests...
```

### 3. Start Dashboard
```bash
# In Terminal 2
cd c:\TechTide\Apps\Clawkeeper
bun run dashboard:dev
```

**Expected output:**
```
  VITE v6.3.5  ready in 1234 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 4. Access Application
Open in your browser: **http://localhost:5174**

## 🔑 Login Credentials

**Primary (Recommended):**
- Email: `admin@demo.com`
- Password: `password123`

**Alternative:**
- Email: `admin@meridiantech.example`
- Password: `Demo123!`

---

## ⚠️ Troubleshooting

### ❌ "Invalid credentials"

**Check which port the API is running on:**
```bash
netstat -ano | findstr ":4004"
netstat -ano | findstr ":4005"
```

**If API is on wrong port (4005):**
1. Kill the process: `taskkill /PID <PID> /F`
2. Check `.env` file: `PORT=4004`
3. Restart API server: `bun run dev`

### ❌ "Configuration Errors" on startup

The validation script found issues. Fix them:

```
❌ Configuration Errors:
   - PORT in .env is 4005, but should be 4004
```

**Fix:**
1. Open `.env`
2. Change `PORT=4005` to `PORT=4004`
3. Save file
4. Restart API server

### ❌ "Cannot connect to database"

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# If stopped, start it
docker start techtide-postgres

# Test connection
docker exec techtide-postgres psql -U clawkeeper -d clawkeeper -c "SELECT 1;"
```

### ❌ Dashboard can't connect to API

**Verify ports match:**
- API should be on **4004**
- Dashboard should be on **5174**
- Dashboard proxies `/api` to `http://localhost:4004`

**Check the configuration:**
```bash
bun run validate
```

---

## 📋 Configuration Checklist

Before starting, verify:

- [ ] `.env` file exists (copy from `.env.example` if not)
- [ ] `PORT=4004` in `.env`
- [ ] `DATABASE_URL` configured in `.env`
- [ ] `JWT_SECRET` configured in `.env`
- [ ] PostgreSQL running in Docker
- [ ] No processes on port 4004 or 4005

**Quick validation:**
```bash
bun run validate
```

---

## 🎯 Port Reference

| Service | Port | URL |
|---------|------|-----|
| API Server | 4004 | http://localhost:4004 |
| Dashboard | 5174 | http://localhost:5174 |
| PostgreSQL | 5432 | localhost:5432 |

**These ports are hardcoded in the application. Do not change them.**

---

## 🔄 Full Reset (if things are broken)

```bash
# 1. Stop all servers (Ctrl+C in terminals)

# 2. Kill any lingering processes
taskkill /PID <API_PID> /F
taskkill /PID <DASHBOARD_PID> /F

# 3. Verify .env is correct
cat .env | grep PORT
# Should show: PORT=4004

# 4. Restart PostgreSQL
docker restart techtide-postgres

# 5. Start API server
bun run dev

# 6. Start Dashboard (in new terminal)
bun run dashboard:dev

# 7. Access http://localhost:5174
```

---

## 📞 Still Having Issues?

Run the validation script for detailed diagnostics:
```bash
bun run validate
```

Check the logs in your terminal where the API server is running for specific error messages.
