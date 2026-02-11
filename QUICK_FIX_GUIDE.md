# Quick Fix Guide - Employee ID Mismatch

## Problem
❌ Employee IDs don't match fingerprint machine user IDs
❌ Dashboard shows: EMP356653AB, EMP354935ZP
❌ Machine shows: User 34, User 35

## Solution (3 Simple Steps)

### 1. Run Migration Script
```bash
cd backend
node fix-employee-ids.js
```

### 2. Restart Backend
```bash
npm start
```

### 3. Refresh Dashboard
Open browser and refresh the employees page

## Done! ✅
- Employee IDs now match machine (34, 35, 36...)
- Sorted by user ID, not alphabetically
- No more mismatches

## Alternative: Use API
```bash
curl -X POST http://localhost:3001/api/employees/fix-employee-ids
```

## Rollback (if needed)
```bash
psql -U postgres -d elsewedy_attendance < backup_before_migration.sql
```

---

**Time Required**: 2-3 minutes
**Risk Level**: Low (safe, reversible)
**Data Loss**: None (only updates employee IDs)
