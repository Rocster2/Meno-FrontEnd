# Deployment Guide - Meno NFT Off-ramp Platform

This comprehensive guide covers deployment to both Morph Holesky Testnet and Morph Mainnet.

## Overview

The Meno platform supports dual deployment:
- **Testnet Deployment**: For development, testing, and hackathon demonstrations
- **Mainnet Deployment**: For production use with real transactions

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- Hardhat for smart contract deployment
- Git for version control
- Docker (optional, for containerized deployment)

### Required Accounts
- WalletConnect Project ID
- Paycrest API credentials
- Deployment wallet with sufficient ETH
- Domain name and hosting (for production)

## Step 1: Environment Configuration

### 1.1 Copy Environment Template
```bash
cp .env.example .env
```

### 1.2 Configure Required Variables

#### Web3 Configuration
```bash
# WalletConnect Project ID (required)
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id_here
```

#### Network Configuration
```bash
# Morph Network RPC URLs
NEXT_PUBLIC_MORPH_MAINNET_RPC=https://rpc-quicknode.morphl2.io
NEXT_PUBLIC_MORPH_TESTNET_RPC=https://rpc-quicknode-holesky.morphl2.io

# Block Explorers
NEXT_PUBLIC_MORPH_MAINNET_EXPLORER=https://explorer.morphl2.io
NEXT_PUBLIC_MORPH_TESTNET_EXPLORER=https://explorer-holesky.morphl2.io
```

#### Deployment Environment
```bash
# For testnet deployment
NEXT_PUBLIC_DEPLOYMENT_ENV=testnet

# For mainnet deployment
NEXT_PUBLIC_DEPLOYMENT_ENV=mainnet
```

#### Paycrest Configuration
```bash
# Sandbox (for testing)
NEXT_PUBLIC_PAYCREST_API_KEY=pk_sandbox_your_key_here
PAYCREST_SECRET_KEY=sk_sandbox_your_secret_here

# Production (for mainnet)
# NEXT_PUBLIC_PAYCREST_API_KEY=pk_live_your_key_here
# PAYCREST_SECRET_KEY=sk_live_your_secret_here
```

## Step 2: Smart Contract Deployment

### 2.1 Prepare Deployment Wallet

#### Get Testnet ETH
1. Visit [faucet.quicknode.com/morph/holesky](https://faucet.quicknode.com/morph/holesky)
2. Connect your deployment wallet
3. Request testnet ETH (you'll need ~0.1 ETH for deployment)

#### Get Mainnet ETH
1. Purchase ETH on a centralized exchange
2. Bridge ETH to Morph Mainnet using official bridge
3. Ensure you have sufficient ETH for deployment (~0.05 ETH should be enough)

### 2.2 Configure Hardhat

Update `hardhat.config.js` with your deployment wallet:

```javascript
require('dotenv').config()

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64)

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    morphHolesky: {
      url: process.env.NEXT_PUBLIC_MORPH_TESTNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 2810,
      gasPrice: 20000000000, // 20 gwei
    },
    morphMainnet: {
      url: process.env.NEXT_PUBLIC_MORPH_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 2818,
      gasPrice: 20000000000, // 20 gwei
    }
  },
  etherscan: {
    apiKey: {
      morphHolesky: "your-api-key-here",
      morphMainnet: "your-api-key-here"
    },
    customChains: [
      {
        network: "morphHolesky",
        chainId: 2810,
        urls: {
          apiURL: "https://api-holesky.morphscan.io/api",
          browserURL: "https://explorer-holesky.morphl2.io"
        }
      },
      {
        network: "morphMainnet",
        chainId: 2818,
        urls: {
          apiURL: "https://api.morphscan.io/api",
          browserURL: "https://explorer.morphl2.io"
        }
      }
    ]
  }
}
```

### 2.3 Deploy to Testnet

```bash
# Compile contracts
npm run compile

# Deploy to Morph Holesky Testnet
npm run deploy:testnet

# Verify contracts on testnet
npm run verify:testnet
```

### 2.4 Deploy to Mainnet

```bash
# Deploy to Morph Mainnet
npm run deploy:mainnet

# Verify contracts on mainnet
npm run verify:mainnet
```

### 2.5 Update Contract Addresses

After deployment, update your `.env` file with the deployed contract addresses:

```bash
# Testnet Contract Addresses
NEXT_PUBLIC_TESTNET_MENO_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_FIAT_OFFRAMP_ADDRESS=0x...

# Mainnet Contract Addresses
NEXT_PUBLIC_MAINNET_MENO_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_MAINNET_FIAT_OFFRAMP_ADDRESS=0x...
```

## Step 3: Frontend Deployment

### 3.1 Build Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 3.2 Test Build Locally

```bash
# Start production server locally
npm start
```

### 3.3 Deploy to Hosting Platform

#### Option A: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Option B: Netlify
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Configure environment variables

#### Option C: Custom Server
```bash
# Using PM2 for process management
npm install -g pm2
pm2 start npm --name "meno-nft" -- start
```

## Step 4: Database Setup (Optional)

### 4.1 PostgreSQL Setup

```bash
# Create databases
createdb meno_nft_offramp
createdb meno_nft_offramp_testnet

# Update environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/meno_nft_offramp
DATABASE_URL_TESTNET=postgresql://username:password@localhost:5432/meno_nft_offramp_testnet
```

### 4.2 Redis Setup

```bash
# Install and start Redis
redis-server

# Update environment variables
REDIS_URL=redis://localhost:6379
REDIS_URL_TESTNET=redis://localhost:6380
```

## Step 5: Domain and SSL Configuration

### 5.1 Domain Setup
1. Purchase domain name (e.g., `meno-nft.com`)
2. Configure DNS to point to your hosting provider
3. Set up subdomains:
   - `app.meno-nft.com` - Main application
   - `testnet.meno-nft.com` - Testnet version
   - `api.meno-nft.com` - API endpoints

### 5.2 SSL Certificate
Most hosting providers (Vercel, Netlify) provide automatic SSL certificates.

For custom servers:
```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d meno-nft.com -d www.meno-nft.com
```

## Step 6: Monitoring and Analytics

### 6.1 Error Tracking (Sentry)
```bash
# Add to environment variables
SENTRY_DSN=your_sentry_dsn_here
```

### 6.2 Analytics (Google Analytics)
```bash
# Add to environment variables
NEXT_PUBLIC_GA_TRACKING_ID=your_google_analytics_id_here
```

### 6.3 Performance Monitoring
Set up monitoring for:
- Application uptime
- API response times
- Smart contract interactions
- Database performance

## Step 7: Security Configuration

### 7.1 Environment Variables Security
- Never commit `.env` files to version control
- Use different API keys for testnet and mainnet
- Rotate API keys regularly
- Use environment-specific configurations

### 7.2 API Security
```bash
# JWT Secret for API authentication
JWT_SECRET=your_super_secure_jwt_secret_here

# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 7.3 CORS Configuration
Configure CORS for your API endpoints to only allow requests from your domain.

## Step 8: Testing Deployment

### 8.1 Automated Testing
```bash
# Run service tests
npm run test:services

# Test Paycrest integration
npm run test:paycrest
```

### 8.2 Manual Testing Checklist

#### Testnet Testing
- [ ] Wallet connection works
- [ ] Network switching to Morph Holesky works
- [ ] Can get testnet ETH from faucet
- [ ] NFT detection works (mock mode)
- [ ] NFT listing form works
- [ ] Paycrest integration works (sandbox)
- [ ] Transaction monitoring works
- [ ] Error handling works correctly

#### Mainnet Testing (with small amounts)
- [ ] Wallet connection works
- [ ] Network switching to Morph Mainnet works
- [ ] Real NFT detection works
- [ ] Small test transactions work
- [ ] Paycrest production integration works
- [ ] All features work as expected

## Step 9: Go-Live Checklist

### 9.1 Pre-Launch
- [ ] All smart contracts deployed and verified
- [ ] Frontend deployed to production hosting
- [ ] Database and Redis configured
- [ ] Domain and SSL configured
- [ ] Monitoring and analytics set up
- [ ] Security measures implemented
- [ ] All tests passing
- [ ] Documentation updated

### 9.2 Launch Day
- [ ] Monitor application performance
- [ ] Watch for any errors or issues
- [ ] Be ready to rollback if needed
- [ ] Communicate with users about launch
- [ ] Monitor social media for feedback

### 9.3 Post-Launch
- [ ] Monitor user adoption
- [ ] Collect user feedback
- [ ] Fix any reported issues
- [ ] Plan future updates and features

## Step 10: Maintenance and Updates

### 10.1 Regular Maintenance
- Monitor application performance
- Update dependencies regularly
- Rotate API keys and secrets
- Backup databases regularly
- Monitor smart contract interactions

### 10.2 Updates and Deployments
- Use staging environment for testing
- Deploy during low-traffic periods
- Have rollback plan ready
- Communicate updates to users

## Troubleshooting

### Common Issues

#### Contract Deployment Fails
- Check wallet has sufficient ETH
- Verify network configuration
- Check gas price settings
- Ensure contract code compiles

#### Frontend Build Fails
- Check all environment variables are set
- Verify Node.js version compatibility
- Clear node_modules and reinstall
- Check for TypeScript errors

#### API Integration Issues
- Verify API keys are correct
- Check network connectivity
- Verify endpoint URLs
- Check rate limits

#### Database Connection Issues
- Verify database is running
- Check connection string
- Verify credentials
- Check firewall settings

### Getting Help

- Check application logs for errors
- Review documentation for each service
- Contact support for third-party services
- Join relevant Discord/Telegram communities
- Create GitHub issues for bugs

## Environment-Specific Configurations

### Testnet Configuration
```bash
NEXT_PUBLIC_DEPLOYMENT_ENV=testnet
NEXT_PUBLIC_PROJECT_ID=testnet_project_id
NEXT_PUBLIC_PAYCREST_API_KEY=pk_sandbox_key
NEXT_PUBLIC_DEBUG_MODE=true
```

### Mainnet Configuration
```bash
NEXT_PUBLIC_DEPLOYMENT_ENV=mainnet
NEXT_PUBLIC_PROJECT_ID=production_project_id
NEXT_PUBLIC_PAYCREST_API_KEY=pk_live_key
NEXT_PUBLIC_DEBUG_MODE=false
```

This deployment guide ensures a smooth transition from development to production while maintaining security and reliability standards.