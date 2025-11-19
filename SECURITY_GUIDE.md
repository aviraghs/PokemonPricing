# Security Guide

This document provides security best practices for the Pokemon Card Checker application.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [API Key Rotation](#api-key-rotation)
3. [JWT Security](#jwt-security)
4. [Database Security](#database-security)
5. [Deployment Security](#deployment-security)
6. [Security Checklist](#security-checklist)

---

## Environment Variables

### ✅ Current Security Status

- ✅ `.env.local` is in `.gitignore` (not committed to repository)
- ✅ No hardcoded secrets found in codebase
- ✅ Environment validation enabled on server startup
- ✅ Only `.env.local.example` is tracked in git

### Required Environment Variables

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=<64-character-hex-string>

# Application
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Optional API Keys

```bash
# Price fetching services
RAPIDAPI_KEY=your_rapidapi_key
POKEMONPRICETRACKER_API_KEY=your_pokemon_price_tracker_key
JUSTTCG_API_KEY=your_justtcg_key
POKEFETCH_API_KEY=your_pokefetch_key
```

### Environment Variable Best Practices

1. **Never commit `.env.local` to version control**
2. **Use different secrets for development and production**
3. **Rotate secrets regularly** (at least every 90 days)
4. **Use strong, randomly-generated secrets**
5. **Store production secrets in deployment platform** (Vercel, Netlify, etc.)

---

## API Key Rotation

### When to Rotate API Keys

- ✅ **Immediately** if keys are exposed (committed to git, shared publicly, etc.)
- ✅ **Every 90 days** as a security best practice
- ✅ **When team members leave** with access to keys
- ✅ **After a security incident**

### How to Rotate API Keys

#### 1. MongoDB URI

If your MongoDB credentials were exposed:

```bash
# MongoDB Atlas
1. Go to Database Access
2. Edit user password or create new user
3. Update MONGO_URI in .env.local
4. Update MONGO_URI in Vercel/deployment platform
5. Test connection: node scripts/create-indexes.js
6. Delete old credentials after migration
```

#### 2. RapidAPI Key

```bash
1. Visit: https://rapidapi.com/developer/security
2. Click "Regenerate" on your API key
3. Copy new key
4. Update RAPIDAPI_KEY in .env.local
5. Update in production environment
6. Test API calls
```

#### 3. Pokemon Price Tracker API Key

```bash
1. Log into pokemonpricetracker.com
2. Navigate to API settings
3. Generate new API key
4. Update POKEMONPRICETRACKER_API_KEY
5. Revoke old key
```

#### 4. JustTCG API Key

```bash
1. Contact JustTCG support for new API key
2. Update JUSTTCG_API_KEY
3. Confirm old key is revoked
```

#### 5. PokeFetch API Key

```bash
1. Visit PokeFetch dashboard
2. Generate new API key
3. Update POKEFETCH_API_KEY
4. Delete old key
```

### Rotation Checklist

- [ ] Generate new API key from provider
- [ ] Update `.env.local` locally
- [ ] Update environment variables in Vercel/deployment platform
- [ ] Test all features that use the API
- [ ] Revoke old API key
- [ ] Document rotation date

---

## JWT Security

### Generate Strong JWT Secret

```bash
# Generate a cryptographically secure 64-byte secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### JWT Best Practices

1. **Use at least 64 characters** for JWT_SECRET
2. **Never reuse secrets** across environments
3. **Implement token expiration** (add to JWT payload)
4. **Use refresh tokens** for long-lived sessions
5. **Rotate JWT secret periodically** (requires user re-authentication)

### Current JWT Implementation

⚠️ **Warning**: Current JWT implementation does NOT include expiration. This should be added:

```typescript
// In lib/jwt.ts (or wherever JWT is signed)
const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' } // Add expiration
);
```

---

## Database Security

### MongoDB Atlas Security Checklist

- [ ] **Enable network access restrictions** (IP whitelist)
- [ ] **Use strong passwords** (20+ characters, random)
- [ ] **Enable database encryption** at rest
- [ ] **Enable automated backups**
- [ ] **Use least-privilege user accounts**
- [ ] **Enable audit logging** (Atlas M10+ clusters)
- [ ] **Monitor database access logs**

### Database Indexes

✅ Database indexes have been created for optimal performance and security:

```bash
# Verify indexes are created
node scripts/create-indexes.js
```

### Connection String Security

```bash
# ❌ BAD - Exposes credentials
MONGO_URI=mongodb://admin:password123@cluster.mongodb.net/db

# ✅ GOOD - Use strong password and environment variable
MONGO_URI=mongodb+srv://user:rAnD0m_p@SsW0rD_64_Ch@Rs@cluster.mongodb.net/pokemon_cards?retryWrites=true&w=majority
```

---

## Deployment Security

### Vercel Deployment

1. **Add environment variables in Vercel dashboard**:
   ```
   Settings → Environment Variables
   ```

2. **Set variables for each environment**:
   - Production
   - Preview (optional)
   - Development (optional)

3. **Required variables for production**:
   ```
   MONGO_URI=<production-mongodb-uri>
   JWT_SECRET=<production-jwt-secret>
   NODE_ENV=production
   NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
   ```

4. **Optional API keys** (for full functionality):
   ```
   RAPIDAPI_KEY=<key>
   POKEMONPRICETRACKER_API_KEY=<key>
   JUSTTCG_API_KEY=<key>
   POKEFETCH_API_KEY=<key>
   ```

### Environment Separation

```
Development  → Use .env.local
Staging      → Use Vercel preview environment variables
Production   → Use Vercel production environment variables
```

**Never use production credentials in development!**

---

## Security Checklist

### Pre-Deployment

- [x] `.env.local` is in `.gitignore`
- [x] No secrets committed to git
- [x] Environment validation enabled
- [x] Database indexes created
- [ ] JWT expiration implemented
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] CSRF protection enabled
- [ ] Security headers configured (CSP, etc.)
- [ ] Input validation on all API routes
- [ ] SQL injection protection (using MongoDB, N/A)
- [ ] XSS protection enabled

### Post-Deployment

- [ ] All environment variables set in production
- [ ] MongoDB network access restricted
- [ ] Automated backups enabled
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring enabled
- [ ] Security scanning scheduled (Snyk, etc.)
- [ ] API rate limits tested
- [ ] HTTPS enforced
- [ ] Dependencies up to date (`npm audit`)

### Regular Maintenance (Every 90 Days)

- [ ] Rotate API keys
- [ ] Update dependencies (`npm update`)
- [ ] Run security audit (`npm audit`)
- [ ] Review access logs
- [ ] Check for unused API keys
- [ ] Review database user permissions
- [ ] Test backup restoration

---

## Common Security Issues to Avoid

### ❌ Don't Do This

```typescript
// Hardcoded secrets
const apiKey = "sk_live_123456789";

// Logging sensitive data
console.log("User password:", password);

// Exposing internal errors to users
return res.json({ error: error.stack });

// Using weak JWT secrets
JWT_SECRET="secret123"
```

### ✅ Do This Instead

```typescript
// Use environment variables
const apiKey = process.env.API_KEY;

// Log only non-sensitive data
console.log("User authenticated:", userId);

// Return generic error messages
return res.json({ error: "An error occurred" });

// Use strong, random secrets
JWT_SECRET=<64-character-random-hex>
```

---

## Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all API keys and secrets**
2. **Check git history** for exposed credentials:
   ```bash
   git log --all --full-history -- .env.local
   ```
3. **Review database access logs** for suspicious activity
4. **Force logout all users** (invalidate JWT tokens)
5. **Enable additional monitoring**
6. **Contact API providers** to revoke compromised keys
7. **Document the incident** and lessons learned

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Questions?

If you have security concerns or questions:

1. Review this guide thoroughly
2. Check the [OWASP guidelines](https://owasp.org/)
3. Consult with a security professional
4. Report vulnerabilities responsibly

**Remember**: Security is an ongoing process, not a one-time task!
