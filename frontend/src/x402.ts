import {
  type Address,
  type Hex,
  numberToHex,
  bytesToHex,
} from 'viem';

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
export function normalizeSignature(raw: Hex | Uint8Array | string): Hex {
  // Convert input to hex string with 0x prefix
  let hex: string;
  if (raw instanceof Uint8Array) {
    hex = bytesToHex(raw);
  } else {
    hex = raw as string;
    if (!hex.startsWith('0x')) hex = `0x${hex}`;
  }

  // If already 65-byte ECDSA (r||s||v), return as-is
  const is65Bytes = hex.length === 132;
  if (is65Bytes) {
    // Heuristic: if it actually looks like an ABI head (offset/len), try decode path below
    const head1 = hex.slice(2, 66);
    const head2 = hex.slice(66, 130);
    const looksLikeAbiHead =
      head1.endsWith('40') && head1.slice(0, -2).match(/^0+$/) &&
      head2.slice(0, -2).match(/^0+$/);
    if (!looksLikeAbiHead) {
      // keep flowing to possible v-fix below
    }
  }

  // If ABI-encoded dynamic bytes: head[0]=offset, then at offset comes [len][data...]
  if (hex.length > 132) {
    const head1 = hex.slice(2, 66);
    const head2 = hex.slice(66, 130);

    const offset = BigInt(`0x${head1}`);
    const length = Number(BigInt(`0x${head2}`));

    // In ABI encoding for a single dynamic bytes argument,
    // the data section starts at `offset`, and the first word there is the length.
    const lengthWordStart = 2 + Number(offset) * 2;
    const dataStart = lengthWordStart + 64; // skip the length word
    const dataEnd = dataStart + length * 2;

    if (dataEnd <= hex.length && length >= 65) {
      const dataHex = hex.slice(dataStart, dataStart + 130); // first 65 bytes (r,s,v)
      return (`0x${dataHex.replace(/^0x/, '')}`) as Hex;
    }

    // Fallback: take last 65-byte tail if present
    if (hex.length >= 130 + 2) {
      const tail = hex.slice(-130);
      return (`0x${tail}`) as Hex;
    }
  }

  // If still unexpected length, return raw hex to let verification fail loudly
  // Before returning, normalize v to 27/28 if wallet returned 0/1
  if (hex.length === 132) {
    const vByte = parseInt(hex.slice(-2), 16);
    if (vByte === 0 || vByte === 1) {
      const adjusted = (vByte + 27).toString(16).padStart(2, '0');
      return (`0x${hex.slice(2, -2)}${adjusted}`) as Hex;
    }
  }

  return hex as Hex;
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
