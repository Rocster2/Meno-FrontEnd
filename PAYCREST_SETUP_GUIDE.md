# Paycrest API Setup Guide

This guide will help you obtain and configure Paycrest API credentials for the Meno NFT Off-ramp platform.

## Overview

Paycrest is our primary fiat off-ramp provider, specializing in USDT/USDC to Nigerian Naira (NGN) conversions. This integration allows users to seamlessly convert their NFT sales proceeds to local currency.

## Step 1: Create Paycrest Account

1. Visit [paycrest.co](https://paycrest.co)
2. Click on "Get Started" or "Sign Up"
3. Choose "Business Account" for API access
4. Complete the registration form with your business details:
   - Business Name: "Meno NFT Marketplace" (or your business name)
   - Business Type: "Fintech/Cryptocurrency"
   - Country: Your business location
   - Email: Your business email
   - Phone: Your business phone number

## Step 2: Business Verification

1. Complete KYC/Business verification:
   - Upload business registration documents
   - Provide proof of address
   - Submit identification documents
   - Wait for verification (usually 1-3 business days)

## Step 3: Access Developer Portal

1. Once verified, log into your Paycrest dashboard
2. Navigate to "Developer" or "API" section
3. Click on "Create New Application"
4. Fill in application details:
   - Application Name: "Meno NFT Off-ramp"
   - Description: "NFT to fiat conversion for Meno marketplace"
   - Website: Your platform URL
   - Webhook URL: `https://your-domain.com/api/webhooks/paycrest`

## Step 4: Generate API Credentials

### Sandbox Credentials (for testing)
1. In the developer portal, select "Sandbox" environment
2. Generate API credentials:
   - **API Key**: Used for public API calls
   - **Secret Key**: Used for server-side operations
   - **Webhook Secret**: Used to verify webhook signatures

### Production Credentials
1. Switch to "Production" environment
2. Generate production API credentials
3. **Important**: Keep production credentials secure and never expose them in client-side code

## Step 5: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Paycrest Configuration
NEXT_PUBLIC_PAYCREST_API_KEY=pk_sandbox_your_public_key_here
PAYCREST_SECRET_KEY=sk_sandbox_your_secret_key_here
PAYCREST_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# For production, use:
# NEXT_PUBLIC_PAYCREST_API_KEY=pk_live_your_public_key_here
# PAYCREST_SECRET_KEY=sk_live_your_secret_key_here
# PAYCREST_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 6: Test API Connection

Run the test script to verify your API credentials:

```bash
npm run test:paycrest
```

Or manually test using the service:

```javascript
import { PaycrestService } from './lib/services/PaycrestService'

const paycrest = new PaycrestService()

// Test API connection
const rates = await paycrest.getConversionRate(100, 'USDT')
console.log('Current rates:', rates)
```

## Step 7: Configure Webhook Endpoints

Set up webhook endpoints to receive real-time updates:

1. In Paycrest dashboard, configure webhook URL:
   - URL: `https://your-domain.com/api/webhooks/paycrest`
   - Events: Select all conversion-related events

2. Implement webhook handler in your API:

```javascript
// pages/api/webhooks/paycrest.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify webhook signature
  const signature = req.headers['paycrest-signature']
  const payload = JSON.stringify(req.body)
  
  // Process webhook event
  const event = req.body
  
  switch (event.type) {
    case 'conversion.completed':
      // Handle successful conversion
      break
    case 'conversion.failed':
      // Handle failed conversion
      break
    default:
      console.log('Unhandled webhook event:', event.type)
  }

  res.status(200).json({ received: true })
}
```

## Step 8: Supported Features

### Conversion Types
- **USDT to NGN**: Primary conversion pair
- **USDC to NGN**: Secondary conversion pair
- **ETH to NGN**: Available but with higher fees

### Payment Methods
- **Bank Transfer**: Direct to Nigerian bank accounts
- **Mobile Money**: MTN, Airtel, Glo, 9mobile
- **Digital Wallets**: Opay, PalmPay, Kuda, etc.

### Transaction Limits
- **Minimum**: ₦1,000 NGN (~$0.65 USD)
- **Maximum**: ₦5,000,000 NGN (~$3,200 USD) per transaction
- **Daily Limit**: ₦10,000,000 NGN (~$6,400 USD)

## Step 9: Rate Limits and Quotas

### API Rate Limits
- **Sandbox**: 100 requests per minute
- **Production**: 1,000 requests per minute
- **Burst**: Up to 10 requests per second

### Monthly Quotas
- **Sandbox**: Unlimited (test transactions only)
- **Production**: Based on your business tier

## Step 10: Error Handling

Common error codes and handling:

```javascript
try {
  const result = await paycrest.initiateConversion(conversionData)
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      // Handle insufficient balance
      break
    case 'INVALID_BANK_DETAILS':
      // Handle invalid bank account
      break
    case 'RATE_LIMIT_EXCEEDED':
      // Handle rate limiting
      break
    case 'KYC_REQUIRED':
      // Handle KYC requirement
      break
    default:
      // Handle other errors
      console.error('Paycrest error:', error)
  }
}
```

## Step 11: Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Use HTTPS** for all API communications
3. **Verify webhook signatures** to prevent spoofing
4. **Implement rate limiting** on your endpoints
5. **Log all transactions** for audit purposes
6. **Use environment variables** for all credentials
7. **Rotate API keys** regularly

## Step 12: Go Live Checklist

Before switching to production:

- [ ] Business verification completed
- [ ] Production API credentials generated
- [ ] Webhook endpoints tested
- [ ] Error handling implemented
- [ ] Security review completed
- [ ] Rate limiting configured
- [ ] Monitoring and alerting set up
- [ ] Compliance requirements met
- [ ] User acceptance testing completed

## Support and Documentation

- **Paycrest Documentation**: [docs.paycrest.co](https://docs.paycrest.co)
- **API Reference**: [api.paycrest.co](https://api.paycrest.co)
- **Support Email**: support@paycrest.co
- **Developer Slack**: [Join Paycrest Developers](https://paycrest.co/slack)

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify key format (pk_sandbox_ or pk_live_)
   - Check environment (sandbox vs production)
   - Regenerate keys if necessary

2. **Webhook Not Receiving Events**
   - Verify webhook URL is accessible
   - Check webhook signature verification
   - Ensure HTTPS is used

3. **Conversion Failures**
   - Verify bank account details
   - Check user KYC status
   - Validate conversion amounts

4. **Rate Limiting**
   - Implement exponential backoff
   - Cache frequently accessed data
   - Optimize API call patterns

For additional support, contact the Meno development team or refer to the Paycrest documentation.