# Deploying to Render.com (Pro Plan)

This guide will help you deploy the zkML News Oracle service to Render.com using the Pro plan with an optimized 2-service architecture.

## Architecture Overview

This deployment uses **2 services** instead of 3:
1. **zkml-combined-service** (Web): Combined backend API + frontend UI
2. **zkml-base-trader** (Worker): Background autonomous trading worker

This architecture provides:
- **Cost savings**: ~$14/month vs ~$21/month (2 services instead of 3)
- **Simpler management**: Fewer services to configure and monitor
- **Optimal separation**: Web traffic separate from autonomous trading operations

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

#### For zkml-combined-service:

Go to the service settings and add:
- `BASE_MAINNET_RPC_URL`: Your Base Mainnet RPC endpoint (e.g., Alchemy)
- `ORACLE_PRIVATE_KEY`: Your oracle wallet private key (starts with 0x)

#### For zkml-base-trader (optional worker):

Same as combined-service:
- `BASE_MAINNET_RPC_URL`
- `ORACLE_PRIVATE_KEY`

### 4. Deploy

1. Click "Apply" to start the deployment
2. Render will create 2 services:
   - `zkml-combined-service` (combined backend API + frontend UI)
   - `zkml-base-trader` (background autonomous trading worker)

### 5. Access Your Deployment

After deployment, you'll get the URL for your combined service:
- **Combined Service**: `https://zkml-combined-service.onrender.com`

This single service provides:
- **Frontend UI** (port 3001): Accessible at the main URL
- **Backend API** (port 3000): Accessible at `/status`, `/api/*` endpoints
- **API Docs**: Available via the "📖 API Docs" button in the UI

## Service URLs

After deployment, your services will be available at:

- **Combined Service (UI + API)**: `https://zkml-combined-service.onrender.com`
- **Health Check**: `https://zkml-combined-service.onrender.com/api/health`
- **API Status**: `https://zkml-combined-service.onrender.com/status`

## Important Notes

### Pro Plan Benefits

- **Always-on services**: No sleep/spin-down after inactivity
- **Better performance**: Enhanced CPU and memory allocation
- **Faster builds**: Priority build queue
- **24/7 uptime**: Services stay running continuously
- **Better reliability**: Higher resource limits

### Performance Tips

1. **Enable BaseTrader worker** for continuous autonomous trading monitoring
2. **Optimize POLL_INTERVAL_MINUTES** for your use case (default: 5 minutes)
3. **Monitor resource usage** via Render dashboard for optimization opportunities
4. **Use health endpoints** for monitoring and alerting:
   - `https://zkml-news-service.onrender.com/status`
   - `https://zkml-ui.onrender.com/health`

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
