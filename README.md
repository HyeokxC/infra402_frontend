# infra402

Infrastructure leasing demo built around `x402` payments.

This repo contains three services:
- `backend-proxmox/`: FastAPI paywalled API that provisions and manages Proxmox LXC containers (port `4021`).
- `backend-llm/`: FastAPI chat agent that calls the paywalled API. It acts as an orchestrator but delegates payment signing to the client (port `8000`).
- `frontend/`: Vite + React UI that calls the agent service and handles crypto payments via wallet connection (port `3000`).

## Requirements

- Python `3.10+`
- `uv` (Python dependency manager)
- Node.js `18+`
- `pnpm`
- Proxmox VE host + API token (to actually create/manage containers)
- An EVM address to receive payments (paywall configuration)
- A browser wallet (e.g., Coinbase Wallet) for the client-side user
- Coinbase Developer Platform API Key (for OnchainKit in the frontend)

## Configuration

### `backend-proxmox` (paywalled API)

Create `backend-proxmox/.env` (start from `backend-proxmox/.example.env`) and set at minimum:
- `ADDRESS`: EVM address to receive payments
- `NETWORK`: EVM network name (defaults to `base-sepolia`)

To enable Proxmox operations, also set:
- `PVE_HOST`, `PVE_TOKEN_ID`, `PVE_TOKEN_SECRET`, `PVE_NODE`, `PVE_STORAGE`, `PVE_OS_TEMPLATE`
- `PVE_ROOT_PASSWORD` (used for console ticket flows)
- `PVE_VERIFY_SSL` (`true`/`false`)
- Optional: `PVE_CONSOLE_HOST` (external hostname for console URLs)

See `backend-proxmox/PROXMOX_API_USAGE.md` for the expected Proxmox-side permissions and endpoints.

### `backend-llm` (agent API)

Create `backend-llm/.env` (start from `backend-llm/.example.env`) and set:
- `LLM_PROVIDER`: `openai` or `flockio`
- If `LLM_PROVIDER=openai`: `OPENAI_API_KEY`
- If `LLM_PROVIDER=flockio`: `FLOCKIO_API_KEY`
- Optional: `BACKEND_BASE_URL` (defaults to `http://localhost:4021`)

Note: `backend-llm/.example.env` may not list all currently used variables; the server reads `LLM_PROVIDER`, `OPENAI_API_KEY`, and `FLOCKIO_API_KEY`.

### `frontend` (UI)

Create `frontend/.env` with:
```
VITE_CHAT_API_BASE=http://localhost:8000
VITE_ONCHAINKIT_API_KEY=your_cdp_api_key
VITE_DEFAULT_NETWORK=base-sepolia
```

## Run (local)

### 1) Start the paywalled API
```bash
cd backend-proxmox
uv sync
uv run python main.py  # http://localhost:4021
```

### 2) Start the agent API
```bash
cd backend-llm
uv sync
uv run python pydantic-server.py  # http://localhost:8000
```

### 3) Start the UI
```bash
cd frontend
pnpm install
pnpm dev  # http://localhost:3000
```

## API surface

Agent service (no payment required):
- `GET /info`: returns the configured LLM base URL + model name (and a masked API key)
- `POST /chat`: chat endpoint; the agent can call paid tools to manage leases. Returns a `payment_request` object if 402 is encountered.

Paywalled Proxmox service (`x402` payment required):
- `POST /lease/container`
- `POST /lease/{ctid}/renew`
- `POST /management/exec/{ctid}`
- `POST /management/console/{ctid}`
- `GET /management/list`

For request/response examples and the payment flow, see `backend-proxmox/API_USAGE.md`.

## Troubleshooting

### Backend Issues

#### 1. Protocol Missing Error

**Error**: `Request URL is missing an 'http://' or 'https://' protocol`

**Cause**: `PVE_HOST` in `backend-proxmox/.env` is missing the protocol prefix.

**Fix**:
```bash
# ❌ Wrong
PVE_HOST="192.168.1.100:8006"

# ✅ Correct
PVE_HOST="https://192.168.1.100:8006"
PVE_CONSOLE_HOST="https://192.168.1.100:8006"
```

#### 2. SSL Certificate Verification Failed

**Error**: `[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed`

**Cause**: Proxmox uses self-signed SSL certificates by default.

**Fix**: Disable SSL verification in `backend-proxmox/.env`:
```bash
PVE_VERIFY_SSL=false
```

**Production Alternative**: Set up proper SSL certificates using Let's Encrypt:
```bash
# On Proxmox server
pvenode acme account register default your-email@example.com
pvenode config set --acme domains=proxmox.yourdomain.com
pvenode acme cert order
```

#### 3. API Token Permissions

**Error**: HTTP 595 or "Permission denied"

**Cause**: API token lacks required permissions.

**Fix**: Grant Administrator role to the token:
```bash
# On Proxmox server
pveum acl modify / -token 'root@pam!yourTokenID' -role Administrator

# Verify permissions
pveum user token permissions root@pam yourTokenID
```

Required permissions:
- `VM.Allocate` - Create containers
- `VM.Config.*` - Configure resources
- `Datastore.AllocateSpace` - Allocate storage
- `Sys.Console` - Console access

#### 4. Wrong Node Name

**Error**: Container creation fails with 595 or "Node not found"

**Cause**: `PVE_NODE` doesn't match actual Proxmox node name.

**Fix**:
```bash
# Check actual node name
pvesh get /nodes

# Update backend-proxmox/.env
PVE_NODE="your-actual-node-name"
```

#### 5. Storage or Template Issues

**Error**: "Storage not found" or "Template not found"

**Fix**:
```bash
# Check available storage
pvesm status

# List templates
pveam list local

# Download Ubuntu template if missing
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst
```

### Frontend Issues

#### Duplicate Payment Requests

**Issue**: Payment triggered multiple times, causing 500 errors.

**Cause**: Auto-payment `useEffect` and manual button click both trigger payment.

**Fix**: Already implemented in `frontend/src/App.tsx` using `isProcessingPayment` ref flag.

#### Wallet Not Connecting

**Issue**: Coinbase Wallet doesn't pop up.

**Fix**:
- Install Coinbase Wallet browser extension
- Ensure wallet is on the correct network (check `VITE_DEFAULT_NETWORK`)
- Check browser console for errors

#### CORS Errors

**Issue**: "Access to fetch blocked by CORS policy"

**Fix**: Ensure backend CORS settings allow frontend origin. In `backend-llm/pydantic-server.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Deployment Issues

#### Vercel Build Fails

**Issue**: Build fails with peer dependency errors.

**Fix**: Use `--legacy-peer-deps` flag in `vercel.json`:
```json
{
  "buildCommand": "cd frontend && npm install --legacy-peer-deps && npm run build"
}
```

#### Environment Variables Not Working

**Issue**: App can't connect to backend after deployment.

**Fix**: Set environment variables in Vercel dashboard:
- `VITE_CHAT_API_BASE` - Your production backend URL
- `VITE_ONCHAINKIT_API_KEY` - CDP API key
- `VITE_DEFAULT_NETWORK` - Network (base-sepolia or base)

## Notes

- Secrets belong in `.env` files and should not be committed.
- The **frontend** is the entity that signs the payment headers using the connected wallet. The agent backend merely facilitates the negotiation.
- For production deployments, always use HTTPS and proper SSL certificates.
- Test thoroughly on testnet (base-sepolia) before deploying to mainnet.