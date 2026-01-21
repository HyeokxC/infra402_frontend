# Infra402 Frontend

React + Vite frontend for the Infra402 container leasing platform with x402 payment integration.

## Features

- 💬 Chat interface with AI agent for container management
- 💳 Automatic wallet connection and payment flow
- 🔐 Client-side payment signing using Coinbase Wallet
- 🚀 Real-time container provisioning via x402 micropayments

## Prerequisites

- Node.js 18+
- npm or pnpm
- Coinbase Wallet browser extension
- Backend services running (see root README.md)

## Environment Setup

Create a `.env` file in the `frontend/` directory:

```bash
# Backend API Configuration
VITE_CHAT_API_BASE=http://localhost:8000

# Blockchain Network (base-sepolia for testnet, base for mainnet)
VITE_DEFAULT_NETWORK=base-sepolia

# OnchainKit API Key (optional but recommended)
# Get from: https://portal.cdp.coinbase.com/products/onchainkit
VITE_ONCHAINKIT_API_KEY=your_api_key_here

# Chain ID (auto-detected from network, override if needed)
# base-sepolia: 84532, base: 8453
VITE_DEFAULT_CHAIN_ID=84532
```

See `.example.env` for a complete template.

## Installation

```bash
cd frontend
npm install --legacy-peer-deps
```

> **Note**: Use `--legacy-peer-deps` flag to resolve peer dependency conflicts.

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal).

## Build

```bash
npm run build
```

Build output will be in `dist/` directory.

## Deployment

### Vercel

The project is configured for Vercel deployment via `vercel.json` in the root directory.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Important**: Set environment variables in Vercel dashboard:
- `VITE_CHAT_API_BASE` - Your production backend URL
- `VITE_ONCHAINKIT_API_KEY` - Your CDP API key
- `VITE_DEFAULT_NETWORK` - Network to use (base-sepolia or base)

## Payment Flow

1. **User sends message** → Backend requires payment (402 response)
2. **Wallet auto-connects** → Coinbase Wallet popup appears
3. **User approves connection** → Payment request shown
4. **Auto-payment triggered** → User signs transaction
5. **Request retried** → With payment header included
6. **Container provisioned** → Success response displayed

### Duplicate Payment Prevention

The app includes built-in duplicate payment prevention:
- Uses `isProcessingPayment` ref to track payment state
- Prevents multiple simultaneous payment requests
- Ensures only one payment per user action

## Troubleshooting

### Wallet Not Connecting

**Issue**: Wallet popup doesn't appear on page load.

**Solution**: 
- Ensure Coinbase Wallet extension is installed
- Check browser console for errors
- Verify `VITE_DEFAULT_NETWORK` matches your wallet network

### Payment Errors

**Issue**: "Request failed: Server error '500 Internal Server Error'"

**Common Causes**:
1. **Backend not running** - Ensure both backend services are running
2. **Wrong network** - Wallet must be on the same network as `VITE_DEFAULT_NETWORK`
3. **Insufficient funds** - Need USDC on the configured network
4. **Backend configuration** - See Backend Troubleshooting section below

### CORS Errors

**Issue**: "Access to fetch blocked by CORS policy"

**Solution**: Backend must allow frontend origin in CORS settings.

## Backend Troubleshooting

If you encounter backend errors (500, 502), check these common issues:

### 1. Proxmox URL Missing Protocol

**Error**: `Request URL is missing an 'http://' or 'https://' protocol`

**Fix**: In backend `.env`, ensure `PVE_HOST` includes protocol:
```bash
# ❌ Wrong
PVE_HOST="192.168.1.100:8006"

# ✅ Correct
PVE_HOST="https://192.168.1.100:8006"
```

### 2. SSL Certificate Verification Failed

**Error**: `[SSL: CERTIFICATE_VERIFY_FAILED]`

**Fix**: Disable SSL verification for self-signed certificates:
```bash
PVE_VERIFY_SSL=false
```

**Production**: Use proper SSL certificates (Let's Encrypt recommended).

### 3. API Token Permissions

**Error**: HTTP 595 or permission denied

**Fix**: Grant Administrator role to API token:
```bash
pveum acl modify / -token 'root@pam!yourTokenID' -role Administrator
```

### 4. Wrong Node Name

**Error**: Container creation fails with 595

**Fix**: Verify node name matches Proxmox:
```bash
# Check actual node name
pvesh get /nodes

# Update .env
PVE_NODE="your-actual-node-name"
```

## Architecture

```
User Browser
    ↓
Frontend (React + Vite)
    ↓
Backend LLM Agent (port 8000)
    ↓
Backend Proxmox API (port 4021) ← x402 Payment Required
    ↓
Proxmox Server
```

## Key Files

- `src/App.tsx` - Main application with chat and payment logic
- `src/Providers.tsx` - Wagmi and OnchainKit configuration
- `src/x402.ts` - x402 payment protocol implementation
- `vercel.json` - Deployment configuration

## Security Notes

- **Never commit `.env` files** - Contains sensitive API keys
- **Client-side signing** - Private keys never leave the browser
- **Payment verification** - Backend validates all payment signatures
- **SSL in production** - Always use HTTPS for production deployments

## Learn More

- [x402 Protocol](https://github.com/base-org/x402)
- [OnchainKit Documentation](https://onchainkit.xyz)
- [Wagmi Documentation](https://wagmi.sh)
- [Vite Documentation](https://vitejs.dev)

## Support

For issues or questions:
1. Check this README's troubleshooting section
2. Review backend logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure wallet has sufficient USDC on the correct network
