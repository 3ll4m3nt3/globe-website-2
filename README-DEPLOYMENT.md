# Deployment Guide: Local Development -> GitHub -> Live Site

This guide explains the exact workflow for this project:

1. Develop locally
2. Push to GitHub
3. Create Pull Requests
4. Deploy to production automatically
5. Roll back safely if needed

---

## 1) One-time setup

### A) Confirm local checks pass

```bash
npm run lint
npm run build
```

### B) Confirm this folder is connected to GitHub

```bash
git status -sb
git remote -v
```

If you already pushed with:

```bash
git push -u origin main
```

then this is complete.

### C) Connect hosting to GitHub (Vercel)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **Add New Project**
4. Import this repository
5. Keep default Next.js settings
6. Click **Deploy**

After this, production is linked to your GitHub repository.

---

## 2) Daily update workflow (quick path)

Use this when you want to update production directly from main.

```bash
git add .
git commit -m "Describe your update"
git push
```

Result:

- GitHub gets your latest code
- Vercel auto-builds
- Production updates when build succeeds

---

## 3) Recommended workflow with Pull Requests

Use this for safer changes and easier review.

### A) Create a feature branch

```bash
git checkout -b feature/short-description
```

### B) Commit your work

```bash
git add .
git commit -m "Add feature or fix"
```

### C) Push branch

```bash
git push -u origin feature/short-description
```

### D) Open a Pull Request on GitHub

1. Open the repo on GitHub
2. Click **Compare & pull request**
3. Review changes
4. Create PR

Vercel creates a Preview Deployment URL for the PR so you can test before merge.

### E) Merge PR to main

After merge:

- main updates
- Vercel deploys production automatically

---

## 4) Rollback options

## Option 1: Vercel instant rollback (fastest)

1. Open Vercel project
2. Go to **Deployments**
3. Find last known good deployment
4. Click **Promote to Production**

Use this when production breaks and you need a quick restore.

## Option 2: Git revert commit (safe history)

```bash
git log --oneline
```

Pick the bad commit and revert it:

```bash
git revert COMMIT_ID
git push
```

This creates a new commit that undoes the bad change.

## Option 3: Reset and force push (advanced)

```bash
git reset --hard COMMIT_ID
git push --force
```

Use only if you understand history rewriting and team impact.

---

## 5) Safe release habits

1. Run local checks before pushing:

```bash
npm run lint
npm run build
```

2. Protect main branch in GitHub settings:
- Require Pull Requests
- Require status checks to pass

3. Tag known good versions:

```bash
git tag v1.0.0
git push origin v1.0.0
```

4. Keep secrets in Vercel Environment Variables, not in committed files.

---

## 6) Troubleshooting quick reference

### Build fails on Vercel but works locally

1. Check Vercel build logs
2. Verify all needed environment variables exist in Vercel
3. Re-run locally:

```bash
npm ci
npm run build
```

4. If Cesium globe loads locally but fails on Vercel, add `NEXT_PUBLIC_ASSET_PREFIX` in Vercel Environment Variables only when you use an asset/CDN prefix. Leave it empty for normal root deployments.

5. After deploy, verify these URLs return 200 on your production domain:
- `/Cesium/Workers/createTaskProcessorWorker.js`
- `/Cesium/Assets/approximateTerrainHeights.json`

6. If production shows `Octal escape sequences are not allowed in template strings` from a `/_next/static/...` chunk, force webpack builds for Cesium compatibility (`next build --webpack`).

### Wrong content on production

1. Confirm commit reached main on GitHub
2. Confirm latest deployment succeeded in Vercel
3. Roll back using Option 1 above if needed

### Accidental push to main

Use `git revert` and push the revert commit.

---

## Command cheat sheet

```bash
# New work branch
git checkout -b feature/my-change

# Save work
git add .
git commit -m "My change"

# Push branch and create PR
git push -u origin feature/my-change

# Update main directly (if needed)
git checkout main
git pull
git add .
git commit -m "Update main"
git push

# Revert a bad commit
git log --oneline
git revert COMMIT_ID
git push
```
