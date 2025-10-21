# Deploying to Render.com (Free Tier)

This guide will help you deploy the zkML News Oracle service to Render.com's free tier.

## Prerequisites

1. A GitHub account with this repository pushed to GitHub
2. A Render.com account (sign up at https://render.com)
3. Base Mainnet RPC URL (e.g., from Alchemy or Infura)
4. Oracle wallet private key

## Deployment Steps

### 1. Push to GitHub

Ensure your code is pushed to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Connect Render to GitHub

1. Go to https://render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub account if not already connected
4. Select this repository

### 3. Configure Environment Variables

Render will automatically detect the `render.yaml` file. You need to set these **secret** environment variables in the Render dashboard:

#### For zkml-news-service:

Go to the service settings and add:
- `BASE_MAINNET_RPC_URL`: Your Base Mainnet RPC endpoint (e.g., Alchemy)
- `ORACLE_PRIVATE_KEY`: Your oracle wallet private key (starts with 0x)

#### For zkml-ui:

Go to the service settings and add:
- `BASE_MAINNET_RPC_URL`: Same as above

#### For zkml-base-trader (optional):

Same as news-service:
- `BASE_MAINNET_RPC_URL`
- `ORACLE_PRIVATE_KEY`

### 4. Deploy

1. Click "Apply" to start the deployment
2. Render will create 3 services:
   - `zkml-news-service` (backend API)
   - `zkml-ui` (frontend)
   - `zkml-base-trader` (background worker)

### 5. Update UI to Point to Backend

After deployment, you'll get URLs like:
- Backend: `https://zkml-news-service.onrender.com`
- Frontend: `https://zkml-ui.onrender.com`

The frontend is already configured to use `NEWS_SERVICE_URL` environment variable.

## Service URLs

After deployment, your services will be available at:

- **Frontend UI**: `https://zkml-ui.onrender.com`
- **News Service API**: `https://zkml-news-service.onrender.com`
- **API Docs**: Available via the "📖 API Docs" button in the UI

## Important Notes

### Free Tier Limitations

- Services sleep after 15 minutes of inactivity
- 750 hours/month of runtime per service
- Services take ~30 seconds to wake up from sleep
- Limited CPU and memory

### Cost-Saving Tips

1. **Disable BaseTrader worker** if you don't need continuous trading monitoring
2. **Increase POLL_INTERVAL_MINUTES** to reduce API calls and resource usage
3. Services will auto-sleep when not in use

### Keeping Services Awake (Optional)

To prevent services from sleeping, you can:

1. Use a free uptime monitoring service like UptimeRobot
2. Ping your health endpoints every 10 minutes:
   - `https://zkml-news-service.onrender.com/status`
   - `https://zkml-ui.onrender.com/health`

### Manual Wake-Up

If services are sleeping, simply visit the URL and wait 30 seconds for it to wake up.

## Troubleshooting

### Build Fails

Check build logs in Render dashboard. Common issues:
- Missing dependencies: Ensure `package.json` is correct
- Node version: Render uses Node 20 by default

### Service Crashes

Check service logs for errors:
- Missing environment variables
- RPC connection issues
- Out of memory (reduce POLL_INTERVAL_MINUTES)

### Contract Connection Fails

Verify:
- `BASE_MAINNET_RPC_URL` is set correctly
- Oracle wallet has ETH for gas
- Contract addresses are correct for Base Mainnet

## Environment Variables Reference

### Required (Secret)
- `BASE_MAINNET_RPC_URL`: Base Mainnet RPC endpoint
- `ORACLE_PRIVATE_KEY`: Wallet private key for signing transactions

### Optional (Public - already in render.yaml)
- `POLL_INTERVAL_MINUTES`: News polling interval (default: 5)
- `MIN_CONFIDENCE_THRESHOLD`: Minimum confidence for classification (default: 60)
- `PORT`: Service port (default: 3000 for backend, 3001 for UI)
- `LOG_LEVEL`: Logging level (default: info)
- `ENABLE_AUTO_TRADE`: Enable autonomous trading (default: true)

## Monitoring

Monitor your deployment:
1. Render Dashboard: View logs, metrics, and deploy history
2. Service Health: `/status` endpoint for news-service
3. UI Health: `/health` endpoint for UI server

## Updating

To update your deployment:

```bash
git add .
git commit -m "Update message"
git push
```

Render will automatically redeploy on git push to your main branch.

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: Report issues in your repository
