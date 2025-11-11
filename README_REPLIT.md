# Running on Replit

## 🚀 Quick Start

Your Next.js app is now configured to run on Replit!

### How to Run

1. **Click the "Run" button** at the top of Replit
   - This will start the Next.js development server
   - The app will open in the Replit webview

2. **Or use the Shell** to run manually:
   ```bash
   npm run dev
   ```

### Accessing Your App

- **In Replit Webview**: Opens automatically when you click Run
- **In New Tab**: Click the "Open in new tab" icon
- **Public URL**: Your Replit will have a URL like:
  `https://your-repl-name.your-username.repl.co`

## 🔧 Configuration

### Environment Variables

Set these in the **Secrets** tab (🔒 icon on left sidebar):

1. `MONGO_URI` - Your MongoDB connection string
2. `JWT_SECRET` - A random secure string

**Or** edit `.env.local` file directly (already created).

### MongoDB Options

**Option 1: MongoDB Atlas (Recommended for Replit)**
1. Go to https://mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to Secrets tab as `MONGO_URI`

**Option 2: Replit Database**
- Use Replit's built-in database
- But you'll need to adapt the code

**Option 3: Local MongoDB (Not recommended on Replit)**
- Replit ephemeral filesystem
- Data lost on restart

## 📁 Important Files

- `.replit` - Replit run configuration
- `package.json` - Scripts and dependencies
- `.env.local` - Environment variables (local)
- `app/` - Next.js pages and routes
- `components/` - React components
- `lib/` - Utility functions

## 🐛 Troubleshooting

### Port Issues
The app runs on port 3000 by default. Replit automatically maps this.

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### MongoDB Connection Failed
- Check MONGO_URI in Secrets
- Whitelist `0.0.0.0/0` in MongoDB Atlas (for Replit)
- Test connection string

## 🔄 Switching Between Old & New

**New Next.js App (Current):**
```bash
npm run dev
```

**Old Express Server:**
```bash
npm run legacy-server
```

## 📝 Development Tips

### Hot Reload
Next.js automatically reloads when you edit files!

### View Logs
Check the Console tab in Replit to see server logs.

### Stop Server
Click the Stop button or use `Ctrl+C` in Shell.

## 🚀 Deploying from Replit

### Option 1: Use Replit Deployments
- Click "Deploy" button
- Follow Replit's deployment wizard
- Automatic HTTPS & custom domains

### Option 2: Export to Vercel
1. Connect GitHub to your Repl
2. Push to GitHub
3. Import to Vercel
4. Auto-deploy on push

## 🎯 Quick Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Legacy
npm run legacy-server  # Run old Express app

# Utils
npm run lint         # Run ESLint
```

## ✅ Your App is Ready!

Just click **Run** and your Next.js Pokémon Card app will start! 🎉
