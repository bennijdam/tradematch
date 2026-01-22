# JWT_SECRET Setup for Render

## ⚠️ CRITICAL - REQUIRED FOR PRODUCTION

The backend now uses **JWT (JSON Web Tokens)** for secure authentication. You **MUST** set the `JWT_SECRET` environment variable in Render before users can register or login.

---

## Quick Setup (2 minutes)

### 1. Generate a Secure JWT_SECRET

Run this command locally to generate a cryptographically secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
1e249511ff6dfa48b26031f33aca2dfd0c1fd917bf970d1e56d0aa362c15da7c
```

⚠️ **IMPORTANT**: 
- Never use the example above in production
- Generate your own unique secret
- Keep it private and never commit it to Git

---

### 2. Add to Render Dashboard

1. Go to: https://dashboard.render.com
2. Select your `tradematch-backend` service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `JWT_SECRET`
   - **Value**: `<paste your generated secret here>`
6. Click **Save Changes**

Render will automatically redeploy your backend with the new environment variable.

---

### 3. Verify It's Working

After Render redeploys (1-2 minutes), test the authentication:

```bash
# Test registration (should succeed)
curl -X POST https://tradematch.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "userType": "customer",
    "phone": "07123456789",
    "postcode": "SW1A 1AA"
  }'

# Test login (should return JWT token)
curl -X POST https://tradematch.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected login response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "userType": "customer",
    "fullName": "Test User",
    "email": "test@example.com"
  }
}
```

---

## What Changed?

### Security Improvements:

✅ **Bcrypt Password Hashing**
- Passwords now hashed with bcrypt (10 rounds) before storing
- Plain text passwords never stored in database
- Impossible to recover original password from hash

✅ **JWT Authentication**
- Real JWT tokens signed with `JWT_SECRET`
- Tokens expire after 7 days
- Contains user info (id, email, userType) in encrypted payload

✅ **Protected Endpoints**
- Added `/api/auth/me` endpoint to get current user
- Requires `Authorization: Bearer <token>` header
- Returns 401 if token missing, 403 if token invalid/expired

---

## Frontend Integration

The frontend is already configured to use JWT tokens:

```javascript
// Login returns JWT token
const response = await api.login(email, password);
localStorage.setItem('token', response.token); // JWT stored

// Protected requests send token in header
fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## Troubleshooting

### "Server configuration error" on login
- **Cause**: `JWT_SECRET` not set in Render
- **Fix**: Add `JWT_SECRET` environment variable (see Step 2 above)

### "Invalid or expired token"
- **Cause**: Token expired (older than 7 days) or JWT_SECRET changed
- **Fix**: User must login again to get new token

### Passwords not working after deployment
- **Cause**: Old plain-text passwords incompatible with new bcrypt hashing
- **Fix**: Users must re-register with new accounts

---

## Security Best Practices

✅ **DO:**
- Generate a unique `JWT_SECRET` for production
- Keep `JWT_SECRET` private and secure
- Rotate `JWT_SECRET` periodically (invalidates all tokens)
- Use HTTPS (already enabled on Render)

❌ **DON'T:**
- Use example secrets from documentation
- Commit `JWT_SECRET` to Git
- Share `JWT_SECRET` publicly
- Use short or weak secrets

---

## Next Steps

After setting `JWT_SECRET`:

1. ✅ Wait for Render to redeploy (1-2 minutes)
2. ✅ Test registration and login from frontend
3. ✅ Verify activation emails are sent
4. ✅ Confirm users can't login before activating
5. ✅ Test protected endpoints with JWT token

---

**Status**: 🔴 **REQUIRED** - Backend will fail authentication without this variable  
**Priority**: 🔥 **CRITICAL** - Set before allowing user registrations  
**Generated**: January 22, 2026  
**Deployment**: Render auto-deploys on git push
