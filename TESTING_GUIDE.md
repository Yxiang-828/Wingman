# Hybrid Authentication & Sync Testing Guide

## Overview
This guide covers testing the complete hybrid authentication system with online/offline capabilities, username conflict resolution, and connection status indicators.

## Prerequisites
- Backend server running on expected port
- Supabase configured and accessible
- SQLite database accessible via Electron API
- Multiple browser tabs/windows for concurrent testing

---

## Test Categories

### 1. Connection Status Indicator Tests

#### 1.1 Basic Connection Status Display
**Test:** Connection indicator visibility and positioning
- [ ] Load login page - indicator appears in top-right corner
- [ ] Indicator shows initial "Checking..." state with blue dot
- [ ] After check, shows appropriate status (Online/Offline/Server Offline)
- [ ] Indicator stays fixed in position during card animations
- [ ] Tooltip shows "Last checked: [time]" on hover

#### 1.2 Connection State Changes
**Test:** Real-time connection monitoring
- [ ] Start with internet connected - shows "Online" (green)
- [ ] Disconnect internet - immediately shows "Offline" (orange)
- [ ] Reconnect internet - shows "Online" after brief check
- [ ] Stop backend server - shows "Server Offline" (red)
- [ ] Restart backend - shows "Online" after health check

#### 1.3 Header Connection Status
**Test:** Connection status in main app header
- [ ] Login successfully and navigate to dashboard
- [ ] Connection status appears in header next to other controls
- [ ] Status updates match login page behavior
- [ ] Compact mode shows only indicator dot (no text on mobile)

---

### 2. User Registration Tests

#### 2.1 Online Registration - Success Cases
**Test:** Normal online registration flow
- [ ] Fill registration form with unique username/email
- [ ] Submit form - shows "Creating Account..." loading state
- [ ] Success: User created in both Supabase and SQLite
- [ ] Check SQLite: `last_synced_at` = current time (not `created_at`)
- [ ] Check Supabase: User exists with same data
- [ ] Automatic login and navigation to dashboard
- [ ] Connection status shows "Online"

#### 2.2 Online Registration - Username Conflicts
**Test:** Username conflict handling
- [ ] Try to register with existing username
- [ ] Error message: "Username [name] is already taken. Please choose a different username."
- [ ] No suggestions shown (as requested)
- [ ] User can modify username and try again
- [ ] Form stays populated with other data (name, email)
- [ ] Success after choosing unique username

#### 2.3 Offline Registration
**Test:** Registration when offline
- [ ] Disconnect internet
- [ ] Fill registration form
- [ ] Shows warning: "Registration is only available offline for testing..."
- [ ] Submit form - success message appears
- [ ] User stored only in SQLite with `last_synced_at = null`
- [ ] No Supabase entry created
- [ ] Automatic login works
- [ ] Connection status shows "Offline"

---

### 3. User Login Tests

#### 3.1 Online Login - Existing Users
**Test:** Login with cloud-synced credentials
- [ ] Login with username/password that exists in Supabase
- [ ] Success: User data updated in SQLite
- [ ] SQLite `last_synced_at` = current login time
- [ ] SQLite `created_at` and `updated_at` match Supabase
- [ ] Session storage populated correctly
- [ ] Navigation to dashboard

#### 3.2 Online Login - Non-existent Local User
**Test:** First-time login on device with existing cloud account
- [ ] Clear local SQLite data for a user
- [ ] Login with valid Supabase credentials
- [ ] User data downloaded and stored locally
- [ ] `last_synced_at` = current time (not Supabase `updated_at`)
- [ ] All timestamps properly formatted
- [ ] Login successful

#### 3.3 Offline Login Fallback
**Test:** Offline authentication
- [ ] Ensure user exists in local SQLite
- [ ] Disconnect internet
- [ ] Login with local credentials
- [ ] Success: Authentication works offline
- [ ] Connection status shows "Offline"
- [ ] Full app functionality available

#### 3.4 Failed Authentication
**Test:** Invalid credentials
- [ ] Try invalid username/password online
- [ ] Shows: "Invalid username or password"
- [ ] Try invalid credentials offline
- [ ] Same error message
- [ ] No user session created

---

### 4. Sync and Conflict Resolution Tests

#### 4.1 Offline-to-Online Username Conflicts
**Test:** Core conflict resolution flow

**Setup:**
1. Register user offline with username "testuser123"
2. While offline, manually create another user in Supabase with same username
3. Reconnect internet

**Expected Behavior:**
- [ ] Connection indicator shows online status
- [ ] Sync attempt triggered on login
- [ ] Username conflict detected
- [ ] Username Conflict Modal appears with:
  - Error message about "testuser123" being taken
  - Input field for new username
  - Cancel/Update buttons
  - Info note about local data safety
- [ ] User enters new username "testuser456"
- [ ] Modal validates username availability
- [ ] Success: Username updated locally and synced to cloud
- [ ] Modal closes, sync completes
- [ ] User data fully synchronized

#### 4.2 Username Update Validation
**Test:** Username availability checking during conflict resolution
- [ ] Open username conflict modal
- [ ] Try entering username that already exists
- [ ] Error: "Username is already taken..."
- [ ] Try unique username
- [ ] Success: Update proceeds
- [ ] Local session updated with new username

#### 4.3 Sync Manager Background Operation
**Test:** Automatic sync monitoring
- [ ] Login with offline user
- [ ] Monitor network tab/console for sync attempts
- [ ] Disconnect/reconnect internet multiple times
- [ ] Sync attempts triggered appropriately (not too frequently)
- [ ] No modal appears if no conflicts
- [ ] Successful syncs complete silently

---

### 5. Edge Cases and Error Handling

#### 5.1 Network Interruption During Operations
**Test:** Unstable connection scenarios
- [ ] Start registration online, disconnect mid-request
- [ ] Appropriate error handling and fallback
- [ ] Start login online, disconnect mid-request
- [ ] Graceful degradation to offline mode

#### 5.2 Backend Server Restart
**Test:** Server availability changes
- [ ] Stop backend during active session
- [ ] Connection status changes to "Server Offline"
- [ ] App continues functioning with local data
- [ ] Restart backend
- [ ] Connection status returns to "Online"
- [ ] Sync operations resume

#### 5.3 Malformed Local Data
**Test:** Data corruption recovery
- [ ] Manually corrupt SQLite data
- [ ] Login attempt with valid cloud credentials
- [ ] System recovers by downloading fresh data
- [ ] Local data overwritten with cloud version

#### 5.4 Concurrent Registration
**Test:** Race condition handling
- [ ] Open two browser windows
- [ ] Simultaneously register with same username
- [ ] One succeeds, other gets conflict error
- [ ] Backend prevents duplicate usernames

---

### 6. Username Update Feature Tests

#### 6.1 Direct Username Updates
**Test:** Manual username changes
- [ ] Call `updateUsername("newusername")` directly
- [ ] Online: Checks availability before updating
- [ ] Success: Updates local data and syncs to cloud
- [ ] Offline: Updates locally, syncs when online
- [ ] Session storage updated correctly

#### 6.2 Username Update Error Cases
**Test:** Update failure scenarios
- [ ] Try updating to existing username
- [ ] Error returned with appropriate message
- [ ] Local data unchanged
- [ ] Try updating when offline
- [ ] Update queued for sync when online

---

### 7. Data Consistency Tests

#### 7.1 Timestamp Verification
**Test:** Proper timestamp handling
- [ ] Register new user online
- [ ] Verify SQLite timestamps:
  - `created_at` = Supabase creation time
  - `updated_at` = Supabase update time  
  - `last_synced_at` = current local time (NOT Supabase time)
- [ ] Login existing user
- [ ] Verify `last_synced_at` updated to current time
- [ ] Update username
- [ ] Verify timestamps updated appropriately

#### 7.2 Cross-Device Consistency
**Test:** Multi-device synchronization
- [ ] Register user on Device A
- [ ] Login same user on Device B
- [ ] Data matches between devices
- [ ] Update data on Device A
- [ ] Sync reflected on Device B after reconnection

---

### 8. UI/UX Tests

#### 8.1 Loading States and Feedback
**Test:** User experience during operations
- [ ] All buttons show loading states during operations
- [ ] Progress indicators appear for longer operations
- [ ] Error messages are clear and actionable
- [ ] Success feedback provided where appropriate

#### 8.2 Form Validation
**Test:** Input validation and user guidance
- [ ] Username field validates format
- [ ] Email field validates email format
- [ ] Password length enforced (4-6 characters)
- [ ] Required fields marked and validated
- [ ] Real-time validation feedback

#### 8.3 Responsive Design
**Test:** Various screen sizes
- [ ] Connection status indicator responsive
- [ ] Username conflict modal responsive
- [ ] Login form works on mobile devices
- [ ] All interactive elements accessible

---

## Testing Checklist Summary

### Quick Smoke Test (5 minutes)
- [ ] Connection indicator shows correct status
- [ ] Register new user online (unique username)
- [ ] Login with existing credentials
- [ ] Disconnect internet, try offline login
- [ ] Reconnect, verify sync operations

### Comprehensive Test (30 minutes)
- [ ] Complete all sections above
- [ ] Document any issues found
- [ ] Verify fixes with retests
- [ ] Performance check (no memory leaks, reasonable response times)

### Stress Test (60 minutes)
- [ ] Multiple rapid connection changes
- [ ] Concurrent user operations
- [ ] Large dataset handling
- [ ] Extended offline periods
- [ ] Backend restart scenarios

---

## Expected Results Summary

**✅ Success Criteria:**
- No data loss in any scenario
- Graceful handling of all network conditions
- Clear user feedback for all operations
- Consistent data across online/offline modes
- Proper conflict resolution without user confusion
- Reliable connection status indication
- Fast response times for common operations

**❌ Failure Indicators:**
- Data corruption or loss
- Hanging operations without feedback
- Inconsistent timestamps
- Duplicate users created
- UI elements not responsive
- Poor error messages
- Sync conflicts not resolved properly

Run through these tests systematically to ensure the hybrid authentication system works reliably in all scenarios!
