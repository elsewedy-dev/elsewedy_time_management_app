# Employee ID Migration Guide

## Overview

This guide will help you migrate existing employees to use their biometric ID (machine user ID) as their employee ID, fixing the mismatch between the fingerprint machine and your dashboard.

## Before Migration

**Current State:**
- Employees have auto-generated IDs like: `EMP356653AB`, `EMP354935ZP`, `EMP355921KN`
- These don't match the user IDs on the fingerprint machine (34, 35, 36, etc.)
- Employees are sorted alphabetically by name

**After Migration:**
- Employees will have IDs matching the machine: `34`, `35`, `36`, etc.
- Employee list will be sorted by user ID (matching machine order)
- No default IT department for new employees

## Migration Steps

### Step 1: Backup Your Database (Recommended)

Before running the migration, backup your PostgreSQL database:

```bash
pg_dump -U postgres -d elsewedy_attendance > backup_before_migration.sql
```

### Step 2: Stop the Backend Server

Make sure the backend server is stopped to avoid conflicts:

```bash
# Press Ctrl+C in the terminal running the backend
```

### Step 3: Run the Migration

Choose one of these methods:

#### Method A: Using the Migration Script (Recommended)

**On Windows:**
```bash
cd backend
run-employee-id-fix.bat
```

**On Linux/Mac:**
```bash
cd backend
node fix-employee-ids.js
```

#### Method B: Using the API Endpoint

1. Start the backend server:
```bash
cd backend
npm start
```

2. Call the migration endpoint:
```bash
curl -X POST http://localhost:3001/api/employees/fix-employee-ids
```

Or use a tool like Postman to POST to:
```
http://localhost:3001/api/employees/fix-employee-ids
```

### Step 4: Review the Results

The migration will output a summary:

```
=== Migration Summary ===
Total employees processed: 127
Successfully updated: 125
Skipped (already correct): 2
Errors: 0
========================
```

**What each status means:**
- **Successfully updated**: Employee ID changed from EMP format to biometric ID
- **Skipped**: Employee already using biometric ID (no change needed)
- **Errors**: Conflicts or issues (see logs for details)

### Step 5: Restart the Backend

```bash
cd backend
npm start
```

### Step 6: Verify in the Dashboard

1. Open your dashboard: `http://localhost:5175`
2. Go to the Employees page
3. Check that:
   - Employee IDs now match the machine user IDs (34, 35, 36, etc.)
   - Employees are sorted by user ID, not alphabetically
   - The order matches what you see on the fingerprint device

## Troubleshooting

### Issue: "Conflict: Employee ID already exists"

**Cause**: Two employees have the same biometric ID (shouldn't happen normally)

**Solution**:
1. Check the logs to see which employees have conflicts
2. Manually investigate in the database:
```sql
SELECT id, "employeeId", "biometricId", "firstName", "lastName" 
FROM employees 
WHERE "biometricId" IS NOT NULL
ORDER BY "biometricId";
```
3. Resolve duplicates manually

### Issue: Migration shows 0 employees processed

**Cause**: No employees have biometric IDs assigned

**Solution**:
1. Sync users from the fingerprint device first:
```bash
curl -X POST http://localhost:3001/api/devices/{device-id}/sync
```
2. Then run the migration again

### Issue: Some employees still have EMP IDs

**Cause**: These employees don't have a biometric ID in the database

**Solution**:
1. These employees were likely created manually, not synced from device
2. You can either:
   - Assign them a biometric ID manually in the database
   - Delete and re-sync them from the device
   - Leave them as-is (they'll keep the EMP format)

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Stop the backend
# Restore the database
psql -U postgres -d elsewedy_attendance < backup_before_migration.sql
# Restart the backend
```

## Testing the Migration

### Test 1: Check Employee IDs
```bash
curl http://localhost:3001/api/employees | jq '.data[] | {name: .firstName, employeeId: .employeeId, biometricId: .biometricId}'
```

Expected output:
```json
{
  "name": "Abeya",
  "employeeId": "35",
  "biometricId": 35
}
```

### Test 2: Verify Sorting
Open the employees page and verify:
- User ID 1 appears first
- User ID 2 appears second
- User ID 34 appears before User ID 35
- NOT sorted alphabetically by name

### Test 3: Check Attendance Matching
1. Have someone scan their fingerprint on the machine
2. Note their user ID on the machine (e.g., 34)
3. Check the dashboard - their attendance should appear under employee ID "34"

## Post-Migration

After successful migration:

1. ✅ Employee IDs match machine user IDs
2. ✅ Employee list sorted by user ID
3. ✅ No more mismatches between machine and dashboard
4. ✅ New employees won't be auto-assigned to IT department

## Need Help?

If you encounter issues:

1. Check the backend logs: `backend/logs/combined.log`
2. Check the migration output for specific errors
3. Verify database connection settings in `backend/.env`
4. Make sure PostgreSQL is running

## Summary

This migration is **safe** and **reversible**:
- ✅ Only updates the `employeeId` field
- ✅ Doesn't delete any data
- ✅ Skips employees already using correct format
- ✅ Reports conflicts before making changes
- ✅ Can be rolled back with database backup

The migration ensures your system matches the fingerprint machine, making it easier to identify employees and track attendance accurately.
