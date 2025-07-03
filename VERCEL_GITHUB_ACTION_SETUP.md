# Vercel GitHub Action Setup

This guide will help you set up the GitHub Action for automatic Vercel deployment.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. VERCEL_TOKEN
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Create a new token with appropriate scope
3. Copy the token value
4. Add it as `VERCEL_TOKEN` in your GitHub repository secrets

### 2. VERCEL_ORG_ID
1. Run `vercel whoami` in your terminal (after installing Vercel CLI)
2. Copy the Organization ID
3. Add it as `VERCEL_ORG_ID` in your GitHub repository secrets

### 3. VERCEL_PROJECT_ID
1. In your project directory, run `vercel link`
2. Check the `.vercel/project.json` file for the project ID
3. Add it as `VERCEL_PROJECT_ID` in your GitHub repository secrets

## How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value

## Workflow Behavior

- **Pull Requests**: Creates preview deployments
- **Push to main/master**: Creates production deployments
- Uses your existing `vercel.json` configuration
- Leverages TurboRepo build optimizations with pnpm

## Vercel CLI Setup (Optional)

If you haven't already, install and set up Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel link
```

## Troubleshooting

- Ensure your `vercel.json` is properly configured
- Verify all secrets are correctly added to GitHub
- Check that your project builds successfully locally with `pnpm run build`
- Make sure your Vercel project is connected to the correct GitHub repository