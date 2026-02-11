# Employee ID and Department Assignment Fix

## Issues Fixed

### 1. Employee ID Mismatch
**Problem**: Backend was auto-generating employee IDs (like EMP356653AB) instead of using the biometric user ID from the fingerprint machine.

**Solution**: Modified `backend/models/Employee.js` to use the biometric ID as the employee ID:
- When syncing users from the device, the `employeeId` field now uses the machine's user ID (biometric ID)
- Example: User ID 34 on the machine → Employee ID "34" in the system
- This ensures the employee ID displayed matches the user ID on the fingerprint device

### 2. Employee List Sorting
**Problem**: Employees were listed alphabetically by name instead of by their user ID from the machine.

**Solution**: Modified `backend/routes/employees.js` to sort by biometric ID first:
- Changed sort order from `[['firstName', 'ASC'], ['lastName', 'ASC']]`
- To: `[['biometricId', 'ASC'], ['firstName', 'ASC'], ['lastName', 'ASC']]`
- Now employees are listed in order of their machine user ID (1, 2, 3, 4, etc.)

### 3. Default IT Department Assignment
**Problem**: All new employees synced from the device were automatically assigned to the IT department.

**Solution**: Modified multiple files to remove default department assignment:
- `backend/models/Employee.js`: Changed `departmentId` to allow NULL values
- `backend/services/zktecoService.js`: Removed IT department lookup and assignment
- `backend/routes/employees.js`: Made department optional in validation
- New employees now have `departmentId: null` and must be manually assigned a department

## Files Modified

1. **backend/models/Employee.js**
   - Updated `beforeValidate` hook to use biometric ID as employee ID
   - Changed `departmentId` field to `allowNull: true`

2. **backend/services/zktecoService.js**
   - Removed default IT department assignment in `syncUsersFromDevice()`
   - Set `employeeId: user.uid.toString()` when creating new employees
   - Set `departmentId: null` for new employees

3. **backend/routes/employees.js**
   - Changed employee list sorting to prioritize biometric ID
   - Made `departmentId` optional in POST and bulk import validations
   - Updated department validation to only check if provided

## How It Works Now

### When Syncing Users from Device:
1. Device user with ID 34 named "Abeya Mosisa" is synced
2. System creates employee with:
   - `biometricId`: 34
   - `employeeId`: "34" (matches machine user ID)
   - `firstName`: "Abeya"
   - `lastName`: "Mosisa"
   - `departmentId`: null (no department assigned)
   - `isActive`: false (will activate on first fingerprint scan)

### When Listing Employees:
- Employees are sorted by their user ID from the machine (34, 35, 36, etc.)
- Not alphabetically by name
- This matches the order users see on the fingerprint device

### Department Assignment:
- New employees have no department assigned
- Admin must manually assign department through the UI
- Prevents all employees from being incorrectly assigned to IT

## Testing

To test these changes:

1. **Sync users from device**: 
   ```bash
   # The sync will create employees with their machine user IDs
   curl -X POST http://localhost:3001/api/devices/{device-id}/sync
   ```

2. **Check employee list**:
   ```bash
   # Employees should be sorted by biometric ID (user ID)
   curl http://localhost:3001/api/employees
   ```

3. **Verify employee IDs match machine**:
   - Check that employee ID in dashboard matches user ID on fingerprint device
   - Example: User 34 on machine → Employee ID "34" in system

## Database Migration Note

### For Existing Employees

Existing employees with auto-generated IDs (EMP356653AB) need to be migrated to use their biometric IDs.

**Option 1: Run Migration Script (Recommended)**
```bash
cd backend
node fix-employee-ids.js
```

Or on Windows:
```bash
cd backend
run-employee-id-fix.bat
```

**Option 2: Use API Endpoint**
```bash
curl -X POST http://localhost:3001/api/employees/fix-employee-ids
```

**Option 3: Clear and Re-sync (Testing Only)**
```bash
# WARNING: This deletes all employees and attendance data
curl -X POST http://localhost:3001/api/employees/clear-all
curl -X POST http://localhost:3001/api/devices/{device-id}/sync
```

### What the Migration Does

The migration script will:
1. Find all employees with biometric IDs
2. Update their `employeeId` to match their `biometricId`
3. Skip employees already using the correct format
4. Report any conflicts or errors

Example:
- Before: Employee "Abeya Mosisa" has `employeeId: "EMP354935ZP"` and `biometricId: 35`
- After: Employee "Abeya Mosisa" has `employeeId: "35"` and `biometricId: 35`

### Migration Output

The script will show:
```
✓ Updated Abeya Mosisa: EMP354935ZP → 35
✓ Updated Abnet Eyasu: EMP355921KN → 36
✓ Updated Adnew Tezera: EMP356154IO → 37
...

=== Migration Summary ===
Total employees processed: 127
Successfully updated: 125
Skipped (already correct): 2
Errors: 0
========================
```

## Benefits

1. **No More Mismatches**: Employee IDs in the system match user IDs on the fingerprint machine
2. **Easier Identification**: Staff can easily find employees by their machine user ID
3. **Correct Sorting**: Employee list matches the order on the fingerprint device
4. **No Default Department**: Prevents incorrect department assignments
5. **Manual Control**: Admins can assign appropriate departments for each employee
