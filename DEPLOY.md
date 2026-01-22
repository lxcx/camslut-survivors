# How to Share Your Game

## Option 1: GitHub Pages (Recommended - Free & Easy)

### Step 1: Create a GitHub Account
- Go to https://github.com and create an account (if you don't have one)

### Step 2: Create a New Repository
1. Click the "+" icon in the top right → "New repository"
2. Name it: `camslut-survivors` (or any name you like)
3. Make it **Public** (required for free GitHub Pages)
4. **Don't** initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 3: Upload Your Files
You have two options:

#### Option A: Using GitHub Desktop (Easiest)
1. Download GitHub Desktop: https://desktop.github.com/
2. Install and sign in
3. File → Add Local Repository → Select `C:\Users\chris\vampire-survivors`
4. Commit all files
5. Publish to GitHub

#### Option B: Using Command Line
Open PowerShell in your game folder and run:
```powershell
cd C:\Users\chris\vampire-survivors
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/camslut-survivors.git
git push -u origin main
```
(Replace YOUR_USERNAME with your GitHub username)

### Step 4: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"
7. Wait a minute, then your game will be live at:
   `https://YOUR_USERNAME.github.io/camslut-survivors/`

---

## Option 2: Netlify Drop (Super Quick - No Account Needed)

1. Go to https://app.netlify.com/drop
2. Drag and drop your entire `vampire-survivors` folder
3. Get an instant URL like: `https://random-name-123.netlify.app`
4. Share that URL!

**Note:** Free Netlify accounts can customize the URL later.

---

## Option 3: Vercel (Also Quick)

1. Go to https://vercel.com and sign up
2. Click "Add New Project"
3. Import your GitHub repo (if using GitHub) OR drag and drop your folder
4. Deploy instantly!

---

## What You Need to Share

Once deployed, you'll get a URL like:
- `https://yourusername.github.io/camslut-survivors/` (GitHub Pages)
- `https://your-game.netlify.app` (Netlify)
- `https://your-game.vercel.app` (Vercel)

Just share that URL with anyone! The game will work in any modern web browser.

---

## Important Notes

- All your files (HTML, CSS, JS, sprites, music) are included
- The game works entirely in the browser - no server needed
- Make sure all file paths are relative (they already are!)
- If you update the game, just push changes to GitHub and it auto-updates
