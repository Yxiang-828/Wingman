# Quick Testing Checklist ✅

## 5-Minute Smoke Test

### Connection Status
- [ ] Green dot = Online (internet + server working)
- [ ] Orange dot = Offline (no internet)
- [ ] Red dot = Server Offline (internet but no backend)
- [ ] Blue dot = Checking...

### Registration Tests
- [ ] Register new user online → success
- [ ] Try same username → error "already taken"
- [ ] Register offline → works, shows offline warning

### Login Tests  
- [ ] Login online → success, syncs data
- [ ] Login offline → works with local data
- [ ] Wrong password → clear error message

### Username Conflict (Advanced)
- [ ] Register offline user "test123"
- [ ] Manually add "test123" to Supabase
- [ ] Go online → conflict modal appears
- [ ] Enter new username → sync succeeds

## 30-Second Browser Console Test

```javascript
// 1. Open browser console on login page
// 2. Copy and paste this:

const quickTest = async () => {
  console.log('🧪 Quick Auth Test Started');
  
  // Test connection status
  try {
    const status = await getConnectionStatus();
    console.log('✅ Connection status:', status);
  } catch (e) {
    console.log('❌ Connection test failed:', e.message);
  }
  
  // Test UI elements
  const elements = {
    connectionStatus: document.querySelector('.connection-status'),
    loginForm: document.querySelector('.login-form'),
    usernameInput: document.querySelector('input[placeholder*="Username"]')
  };
  
  Object.entries(elements).forEach(([name, element]) => {
    console.log(element ? `✅ ${name} found` : `❌ ${name} missing`);
  });
  
  console.log('🏁 Quick test complete!');
};

quickTest();
```

## What Each Status Means

| Status | Color | Meaning |
|--------|--------|---------|
| 🟢 Online | Green | Internet + Backend + Supabase all working |
| 🟡 Server Offline | Yellow | Internet works but backend/Supabase down |
| 🔴 Offline | Red | No internet connection |
| 🔵 Checking... | Blue | Currently testing connection |

## Common Issues & Fixes

### "Connection status stuck on 'Checking...'"
- Backend not running
- Wrong backend URL
- CORS issues

### "Username conflict modal not appearing"
- No actual conflict exists
- Sync manager not loaded
- Check console for errors

### "Offline registration not working"
- ElectronAPI not available
- SQLite database issues
- Check browser console

### "Timestamps wrong in SQLite"
- Check if `last_synced_at` equals current time (not Supabase time)
- Should be ISO string format

## Test Data Cleanup

After testing, clean up test data:

```sql
-- SQLite
DELETE FROM users WHERE username LIKE 'test%';

-- Supabase (via dashboard or API)
DELETE FROM users WHERE username LIKE 'test%';
```

Or use browser console:
```javascript
// Clear local session
localStorage.removeItem('user');
localStorage.removeItem('token');
```
