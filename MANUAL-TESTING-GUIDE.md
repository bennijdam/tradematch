# Manual Testing Guide for Super Admin CRUD Operations

## Test Environment
- **Production URL:** https://tradematch.onrender.com
- **Admin Login Page:** https://tradematch.onrender.com/admin-login.html
- **Dashboard:** https://tradematch.onrender.com/admin-dashboard.html

## Test Credentials
- **Email:** admin@tradematch.com
- **Password:** ChangeMe123!

---

## Test Procedure

### Step 1: Login to Admin Panel
1. Navigate to https://tradematch.onrender.com/admin-login.html
2. Enter email: `admin@tradematch.com`
3. Enter password: `ChangeMe123!`
4. Click "Sign In"
5. You should be redirected to the admin dashboard

**Expected Result:** ✅ Login successful, see dashboard with stats

---

### Step 2: Test User Suspend/Activate

#### Suspend a User
1. From admin dashboard, click **"Users"** in the sidebar
2. Scroll down to find an active user (status: "Active")
3. Click the **"Suspend"** button on that user's row
4. A confirmation dialog appears - click "OK"
5. Enter a reason when prompted (e.g., "Violating terms of service")
6. You should see a green "User suspended successfully" toast notification

**Expected Results:**
- ✅ Toast notification appears: "User suspended successfully"
- ✅ User's status changes from "Active" to "Suspended" in the table
- ✅ Table refreshes and shows updated status

#### Reactivate the User
1. Find the same user (now showing "Suspended" status)
2. Click the **"Activate"** button on that user's row
3. You should see a green toast: "User activated successfully"

**Expected Results:**
- ✅ Toast notification: "User activated successfully"
- ✅ User status changes back to "Active"
- ✅ Table refreshes immediately

---

### Step 3: Test Vendor Approve/Reject

#### Approve a Vendor
1. Click **"Vendors"** in the sidebar
2. Scroll to find a vendor with status **"Pending"** (in the "Pending Vendors" section)
3. Click the green **"✓ Approve"** button on that vendor's card
4. Optional: Enter approval notes in the prompt (or just press OK)
5. You should see a green toast: "Vendor approved successfully"

**Expected Results:**
- ✅ Toast notification: "Vendor approved successfully"
- ✅ Vendor disappears from "Pending Vendors" section
- ✅ Vendor appears in "Approved Vendors" section
- ✅ Vendor's status shows as "Active"

#### Reject a Vendor
1. Find another vendor with status **"Pending"**
2. Click the red **"✗ Reject"** button
3. Enter a rejection reason when prompted (e.g., "Insufficient documentation")
4. Click OK
5. You should see a green toast: "Vendor rejected"

**Expected Results:**
- ✅ Toast notification: "Vendor rejected"
- ✅ Vendor disappears from "Pending Vendors" section
- ✅ Vendor appears in "Rejected Vendors" section
- ✅ Vendor's status shows as "Rejected"

---

### Step 4: Test Review Moderation

1. Click **"Reviews"** in the sidebar
2. Find a review with status **"Pending"**

#### Approve a Review
1. Click the green **"Approve"** button on a pending review
2. You should see: "Review approved" toast notification

**Expected Results:**
- ✅ Toast notification: "Review approved"
- ✅ Review status changes to "Approved"
- ✅ Review becomes visible to customers

#### Hide a Review
1. Find an approved review
2. Click the yellow **"Hide"** button
3. You should see: "Review hidden" toast notification

**Expected Results:**
- ✅ Toast notification: "Review hidden"
- ✅ Review status changes to "Hidden"
- ✅ Review no longer visible to customers (but not deleted)

#### Remove a Review
1. Find a hidden or spam review
2. Click the red **"Remove"** button
3. Confirm in the dialog
4. You should see: "Review removed" toast notification

**Expected Results:**
- ✅ Toast notification: "Review removed"
- ✅ Review is deleted permanently
- ✅ Review disappears from the list

---

### Step 5: Verify Audit Log

This is critical - all actions should be logged!

1. Click **"Audit Log"** in the sidebar
2. You should see entries for all actions you just performed:
   - User suspend action
   - User activate action
   - Vendor approve action
   - Vendor reject action
   - Review moderation actions

**Check Each Entry:**
- ✅ **Action Column** shows correct action name
- ✅ **Target Column** shows correct user/vendor/review ID
- ✅ **Admin Column** shows "admin@tradematch.com"
- ✅ **Details Column** shows reason/notes you provided
- ✅ **Timestamp Column** shows recent time

**Expected Result:** All 5+ actions are logged with complete details

---

### Step 6: Verify Error Handling

#### Test Invalid Actions
1. Go to Users page
2. Try to suspend an already-suspended user (if possible)
3. **Expected:** Error message appears (e.g., "User already suspended")

#### Test Confirmation Dialogs
1. Go to Vendors page
2. Try to reject a vendor without entering a reason
3. **Expected:** Prompt requires a reason before allowing rejection

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Login with credentials | ⬜ | |
| User suspend successful | ⬜ | |
| User status updates in table | ⬜ | |
| User reactivate successful | ⬜ | |
| Vendor approve successful | ⬜ | |
| Vendor appears in approved list | ⬜ | |
| Vendor reject successful | ⬜ | |
| Vendor appears in rejected list | ⬜ | |
| Review approve successful | ⬜ | |
| Review hide successful | ⬜ | |
| Review remove successful | ⬜ | |
| Audit log shows all actions | ⬜ | |
| Audit log has correct details | ⬜ | |
| Error handling works | ⬜ | |
| **OVERALL** | ⬜ | |

---

## Troubleshooting

### "Login failed" error
- Check credentials: `admin@tradematch.com` / `ChangeMe123!`
- Check if admin user exists in database
- Open browser console (F12) to see API response

### "API Error" or blank pages
- Check if server is running
- Open browser console to see network requests
- Verify API endpoint is correct

### Toast notifications not appearing
- Check browser console for JavaScript errors
- Verify `showToast()` function is defined in HTML file
- Check if admin-api.js is loaded correctly

### Audit log showing old entries instead of new ones
- Refresh the page with F5
- Check browser's network tab to see API call response
- Verify database is actually being updated (check CRUD response)

---

## Next Steps After Testing

1. **Document Findings:** Note any issues or unexpected behavior
2. **Fix Issues:** Address any bugs found
3. **Production Deployment:** If all tests pass, push fixes to production
4. **Final Verification:** Re-test on production after deployment

---

## Notes

- All operations should show toast notifications for feedback
- All operations should be logged to audit trail
- User can confirm/cancel actions with dialogs
- Database updates should be immediate (no refresh needed)
- Errors should be user-friendly (no technical messages)

---

**Test Date:** January 23, 2026  
**Tester:** [Your Name]  
**Status:** Ready for manual testing
