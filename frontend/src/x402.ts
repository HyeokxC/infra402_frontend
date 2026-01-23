import { type Address, type Hex, numberToHex } from 'viem';

export const X402_VERSION = 1;

export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: any;
  };
}

export interface PaymentRequest {
  x402Version: number;
  accepts: PaymentRequirement[];
  error: string;
}

export interface X402Header {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: Hex | null;
    authorization: {
      from: Address;
      to: Address;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: Hex;
    };
  };
}

export const EIP712_DOMAIN_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export function generateNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Normalizes a signature to raw 65-byte hex format.
 * Smart Wallets (EIP-1271) may return ABI-encoded signatures,
 * which need to be decoded to extract the raw r, s, v values.
 */
export function normalizeSignature(signature: Hex): Hex {
  // If signature is already 65 bytes (130 hex chars + 0x), return as-is
  if (signature.length === 132) {
    return signature;
  }

  // Smart Wallet signatures may be ABI-encoded
  // Format: 0x + [offset (32 bytes)] + [length (32 bytes)] + [data (65 bytes)]
  // Total: 0x + 64 + 64 + 130 = 260 characters
  if (signature.length > 132) {
    console.log('🔧 Detected ABI-encoded signature, extracting raw signature...');

    // Skip the '0x' prefix
    const hexData = signature.slice(2);

    // The actual signature starts after offset (32 bytes) and length (32 bytes)
    // That's 64 hex chars for offset + 64 hex chars for length = 128 chars
    const signatureData = hexData.slice(128);

    // Extract the first 130 characters (65 bytes) which is the raw signature
    const rawSignature = signatureData.slice(0, 130);

    console.log('✅ Extracted raw signature:', {
      original: signature.substring(0, 50) + '...',
      extracted: '0x' + rawSignature,
    });

    return ('0x' + rawSignature) as Hex;
  }

  // If signature format is unexpected, return as-is and let validation fail
  console.warn('⚠️ Unexpected signature format, length:', signature.length);
  return signature;
}

export function encodeX402Header(header: X402Header): string {
  const json = JSON.stringify(header);
  // Simple Base64 encoding for browser
  return btoa(json);
}

export function getChainId(network: string): number {
  if (import.meta.env.VITE_DEFAULT_CHAIN_ID) {
    return parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID, 10);
  }
  switch (network) {
    case 'base-sepolia':
      return 84532;
    case 'base':
      return 8453;
    case 'sepolia':
      return 11155111;
    case 'mainnet':
      return 1;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}
