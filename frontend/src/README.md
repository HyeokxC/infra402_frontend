# Source Code Documentation

This directory contains the React application source code for the Infra402 frontend.

## File Structure

```
src/
├── App.tsx           # Main application component with chat and payment logic
├── Providers.tsx     # Wagmi and OnchainKit provider configuration
├── main.tsx          # Application entry point
├── x402.ts           # x402 payment protocol utilities
├── index.css         # Global styles
└── vite-env.d.ts     # TypeScript declarations for Vite
```

## Core Components

### App.tsx

Main application component handling:
- **Chat Interface**: Message display and input
- **Payment Flow**: Automatic wallet connection and payment processing
- **State Management**: Messages, loading states, payment requests
- **API Integration**: Communication with backend LLM agent

**Key Features**:
- Auto-connect wallet on page load
- Auto-trigger payment when wallet connects
- Duplicate payment prevention using `isProcessingPayment` ref
- Error handling and user feedback

**Important State Variables**:
```typescript
messages          // Chat message history
pendingPayment    // Current payment request (if any)
pendingMessageContent  // Message that triggered payment
isProcessingPayment    // Ref to prevent duplicate payments
```

**Payment Flow Logic**:
1. User sends message → `sendChat()`
2. Backend returns 402 → `setPendingPayment()`
3. Wallet auto-connects → `useEffect` triggers
4. Payment signed → `handlePayment()`
5. Request retried with payment header → `sendChat()` with headers

### Providers.tsx

Configures blockchain and wallet providers:
- **Wagmi Config**: Wallet connection and blockchain interaction
- **OnchainKit**: Coinbase wallet components and utilities
- **Network Configuration**: Chain setup based on environment variables

**Supported Networks**:
- Base Sepolia (testnet) - Chain ID: 84532
- Base (mainnet) - Chain ID: 8453

### x402.ts

x402 payment protocol implementation:
- **Header Encoding**: Creates payment headers for API requests
- **EIP-712 Signing**: Typed data signing for USDC transfers
- **Nonce Generation**: Unique payment identifiers
- **Type Definitions**: TypeScript types for payment structures

**Key Functions**:
```typescript
encodeX402Header()    // Encode payment data to base64
generateNonce()       // Generate unique payment nonce
getChainId()          // Map network name to chain ID
```

## Payment Prevention Logic

### Problem: Duplicate Payments

Without prevention, payments could be triggered multiple times:
1. `useEffect` auto-triggers when wallet connects
2. User clicks "Sign & Pay" button
3. `useEffect` dependencies change, triggering again

### Solution: Processing Flag

```typescript
const isProcessingPayment = useRef<boolean>(false);

// In useEffect (auto-payment)
if (pendingPayment && isConnected && !isProcessingPayment.current) {
  handlePayment();
}

// In handlePayment()
if (isProcessingPayment.current) return;  // Early exit
isProcessingPayment.current = true;
try {
  // ... payment logic
} finally {
  isProcessingPayment.current = false;  // Always reset
}
```

**Why `useRef` instead of `useState`?**
- No re-renders needed
- Synchronous updates
- Persists across renders
- Perfect for flags/locks

## Environment Variables

All environment variables are accessed via `import.meta.env`:

```typescript
// Backend API URL
const chatApiBase = import.meta.env.VITE_CHAT_API_BASE || "http://localhost:8000";

// Network configuration
const targetNetwork = import.meta.env.VITE_DEFAULT_NETWORK || "base-sepolia";

// OnchainKit API key (in Providers.tsx)
const apiKey = import.meta.env.VITE_ONCHAINKIT_API_KEY;
```

## Common Modifications

### Change Payment Network

Update `VITE_DEFAULT_NETWORK` in `.env`:
```bash
# For mainnet
VITE_DEFAULT_NETWORK=base

# For testnet
VITE_DEFAULT_NETWORK=base-sepolia
```

### Customize Payment Behavior

**Disable Auto-Payment**:
```typescript
// In App.tsx, comment out the auto-payment useEffect (lines 145-154)
```

**Change Payment Timeout**:
```typescript
// In App.tsx, line 150
const timer = setTimeout(() => {
  handlePayment();
}, 500);  // Change delay here (milliseconds)
```

### Add Custom Error Handling

```typescript
// In sendChat() catch block
catch (err) {
  const reason = err instanceof Error ? err.message : "Unexpected error";
  setError(reason);
  
  // Add custom logic here
  console.error("Payment failed:", err);
  // Track analytics, show notification, etc.
}
```

## Debugging Tips

### Enable Verbose Logging

Add console logs in key functions:
```typescript
// In handlePayment()
console.log("Payment started", { pendingPayment, address });

// In sendChat()
console.log("Sending chat", { content, paymentHeaders });
```

### Check Payment State

Use React DevTools to inspect:
- `pendingPayment` - Should be null when no payment needed
- `isProcessingPayment.current` - Should be false when idle
- `messages` - Verify message history

### Verify Network Configuration

```typescript
// Add to App.tsx
useEffect(() => {
  console.log("Network config:", {
    targetNetwork: import.meta.env.VITE_DEFAULT_NETWORK,
    chainId: import.meta.env.VITE_DEFAULT_CHAIN_ID,
    isConnected,
    address
  });
}, [isConnected, address]);
```

## TypeScript Types

### Payment Types (from x402.ts)

```typescript
type PaymentRequirement = {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, any>;
};

type PaymentRequest = {
  accepts: PaymentRequirement[];
};

type X402Header = {
  x402Version: string;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
};
```

### Chat Types (from App.tsx)

```typescript
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Info = {
  base_url: string;
  model_name: string;
  api_key: string;
};
```

## Best Practices

1. **Always handle errors** - Network requests can fail
2. **Validate payment data** - Check amounts and addresses
3. **Use TypeScript strictly** - Avoid `any` types
4. **Keep state minimal** - Only store what's needed
5. **Clean up effects** - Return cleanup functions in `useEffect`
6. **Test payment flow** - Verify on testnet before mainnet

## Testing Checklist

- [ ] Wallet connects automatically on page load
- [ ] Payment request appears when backend returns 402
- [ ] Payment only triggers once (no duplicates)
- [ ] Error messages display correctly
- [ ] Chat history persists during payment flow
- [ ] Reset button clears all state
- [ ] Works on both testnet and mainnet

## Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Wagmi Hooks](https://wagmi.sh/react/hooks/useAccount)
- [OnchainKit Components](https://onchainkit.xyz/wallet/wallet)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
