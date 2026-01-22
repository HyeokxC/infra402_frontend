# Farcaster MiniApp Integration Guide

## Current Setup ✅

Your project already has Farcaster MiniApp integration configured!

### Existing Files:

1. **`frontend/public/.well-known/farcaster.json`** ✅
   - MiniApp metadata
   - App description and branding
   - Categories and tags

2. **`frontend/index.html`** ✅
   - Farcaster meta tag (line 11)
   - Open Graph metadata

## What's Missing

### 1. Account Association (Optional but Recommended)

The `accountAssociation` section in `farcaster.json` is currently empty:

```json
"accountAssociation": {
    "header": "",
    "payload": "",
    "signature": ""
}
```

**Purpose**: Links your Farcaster account to the MiniApp for verification.

**How to Generate**:
```bash
# Install Farcaster CLI
npm install -g @farcaster/auth

# Generate account association
farcaster-auth generate-account-association \
  --fid YOUR_FARCASTER_ID \
  --domain infra402.vercel.app
```

### 2. Required Images

Your `farcaster.json` references these images:
- `https://infra402.vercel.app/icon.png` (app icon)
- `https://infra402.vercel.app/splash.png` (splash screen)
- `https://infra402.vercel.app/og.png` (Open Graph image)
- `https://infra402.vercel.app/embed.png` (Frame embed image)

**Check if these exist**:
```bash
ls frontend/public/*.png
```

**Required Sizes**:
- `icon.png`: 512x512px (square)
- `splash.png`: 1200x630px (landscape)
- `og.png`: 1200x630px (landscape)
- `embed.png`: 1200x630px (landscape)

### 3. Vercel Configuration

Ensure `.well-known` files are served correctly:

**`vercel.json`** (already exists, verify this section):
```json
{
  "headers": [
    {
      "source": "/.well-known/(.*)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

## Testing Your Integration

### 1. Local Testing

```bash
# Start dev server
cd frontend
npm run dev

# Test .well-known endpoint
curl http://localhost:5173/.well-known/farcaster.json
```

### 2. Production Testing

After deploying to Vercel:

```bash
# Test production endpoint
curl https://infra402.vercel.app/.well-known/farcaster.json

# Validate with Farcaster
curl https://infra402.vercel.app | grep "fc:miniapp"
```

### 3. Farcaster Validator

Use the official validator:
- https://warpcast.com/~/developers/miniapps

## Deployment Checklist

- [ ] All required images exist in `frontend/public/`
- [ ] Images are optimized (< 500KB each)
- [ ] `.well-known/farcaster.json` is accessible
- [ ] `index.html` has correct meta tags
- [ ] Domain matches in all config files
- [ ] Account association generated (optional)
- [ ] Tested on Warpcast mobile app

## How Farcaster Discovers Your MiniApp

```
User opens Warpcast
    ↓
Warpcast fetches: https://infra402.vercel.app
    ↓
Reads meta tag: <meta name="fc:miniapp" ... />
    ↓
Fetches: https://infra402.vercel.app/.well-known/farcaster.json
    ↓
Displays MiniApp in Warpcast directory
```

## Current Configuration Summary

Your `farcaster.json` is configured with:
- **Name**: Infra402
- **Category**: Developer Tools
- **Tags**: infrastructure, containers, x402, ai
- **Home URL**: https://infra402.vercel.app
- **Description**: Chat with an AI agent to provision LXC containers

## Next Steps

1. **Generate Images** (if missing):
   ```bash
   # Create icon.png (512x512)
   # Create splash.png (1200x630)
   # Create og.png (1200x630)
   # Create embed.png (1200x630)
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Submit to Farcaster**:
   - Visit https://warpcast.com/~/developers/miniapps
   - Submit your app URL
   - Wait for approval

4. **Test in Warpcast**:
   - Open Warpcast mobile app
   - Search for "Infra402"
   - Launch and test functionality

## Troubleshooting

### MiniApp Not Showing in Warpcast

**Check**:
1. `.well-known/farcaster.json` returns 200 status
2. JSON is valid (use jsonlint.com)
3. All image URLs are accessible
4. Domain matches in all configs

### Images Not Loading

**Fix**:
```bash
# Verify images exist
ls frontend/public/*.png

# Check file sizes (should be < 500KB)
du -h frontend/public/*.png

# Optimize if needed
# Use tools like tinypng.com or imageoptim
```

### Meta Tag Not Detected

**Fix**:
```html
<!-- Ensure this is in index.html <head> -->
<meta name="fc:miniapp" content='{"version":"next",...}' />
```

## Resources

- [Farcaster MiniApp Docs](https://docs.farcaster.xyz/developers/miniapps)
- [Warpcast Developer Portal](https://warpcast.com/~/developers)
- [Base MiniApp Guide](https://docs.base.org/miniapps)
