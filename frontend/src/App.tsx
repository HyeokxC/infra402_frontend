import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Address as AddressComponent, Avatar, Name, Identity, EthBalance } from "@coinbase/onchainkit/identity";
import { useAccount, useSignTypedData, useConnect } from "wagmi";
import {
  encodeX402Header,
  generateNonce,
  getChainId,
  normalizeSignature,
  EIP712_DOMAIN_TYPES,
  type PaymentRequest,
  type PaymentRequirement,
  type X402Header,
  X402_VERSION,
} from "./x402";
import { type Address, type Hex } from "viem";

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

const markdownComponents: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer">
      {props.children}
    </a>
  ),
};

const chatApiBase =
  (import.meta.env.VITE_CHAT_API_BASE as string | undefined)?.replace(
    /\/$/,
    "",
  ) || "http://localhost:8000";

// Build label to confirm deployment recency
const BUILD_LABEL =
  (import.meta.env.VITE_BUILD_LABEL as string | undefined) ||
  new Date().toISOString();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function App() {
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { connect, connectors } = useConnect();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: randomId(),
      role: "assistant",
      content: "hello! how can I help you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PaymentRequest | null>(
    null,
  );

  // Track the message that triggered the payment to retry it
  const [pendingMessageContent, setPendingMessageContent] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLElement | null>(null);
  const isProcessingPayment = useRef<boolean>(false);
  const paymentAttemptCount = useRef<number>(0);

  const canSend = useMemo(
    () => Boolean(input.trim()) && !loading && !pendingPayment,
    [input, loading, pendingPayment],
  );

  // Base App MiniApp SDK - notify app is ready
  const isInMiniApp = typeof window !== 'undefined' && window.parent !== window;

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Auto-connect wallet on page load (skip in MiniApp - wallet already connected)
  useEffect(() => {
    if (isInMiniApp) {
      // In Base MiniApp, wallet is already connected by the app
      console.log('Running in Base MiniApp - skipping auto-connect');
      return;
    }

    if (!isConnected && connectors.length > 0) {
      // Find Coinbase Wallet connector
      const coinbaseConnector = connectors.find(
        (connector) => connector.id === 'coinbaseWalletSDK'
      );
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
    }
  }, [isConnected, connectors, connect, isInMiniApp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${chatApiBase}/info`);
        if (!resp.ok) return;
        const data = (await resp.json()) as Info;
        if (!cancelled) setInfo(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading, pendingPayment]);

  // Auto-trigger wallet connection when payment is required
  useEffect(() => {
    if (pendingPayment && !isConnected && connectors.length > 0) {
      const coinbaseConnector = connectors.find(
        (connector) => connector.id === 'coinbaseWalletSDK'
      );
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
    }
  }, [pendingPayment, isConnected, connectors, connect]);

  // Auto-trigger payment when wallet connects and payment is pending
  useEffect(() => {
    if (pendingPayment && isConnected && address && !loading && !isProcessingPayment.current) {
      // Small delay to ensure wallet is fully ready
      const timer = setTimeout(() => {
        handlePayment();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, pendingPayment, loading]);

  async function sendChat(
    event?: FormEvent,
    overrideContent?: string,
    paymentHeaders?: Record<string, string>,
  ) {
    event?.preventDefault();
    setError(null);

    const content = overrideContent ?? input.trim();
    if (!content) return;
    if (loading) return;

    // If this is a new message (not a retry), add to history
    if (!overrideContent) {
      const userMessage: ChatMessage = {
        id: randomId(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    }

    setLoading(true);

    // Build history for the request
    // Note: If retrying, the last user message is already in `messages` state
    let historyPayload = messages.map(({ role, content: text }) => ({
      role,
      content: text,
    }));

    if (overrideContent) {
      // If retrying, the last message in history is likely the user message we are sending.
      // Remove it to avoid duplication since backend appends `message`.
      const lastMsg = historyPayload[historyPayload.length - 1];
      if (lastMsg && lastMsg.role === 'user' && lastMsg.content === overrideContent) {
        historyPayload.pop();
      }
    }

    try {
      const body: any = {
        message: content,
        history: historyPayload,
      };

      if (paymentHeaders) {
        body.payment_headers = paymentHeaders;
      }

      const response = await fetch(`${chatApiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request failed: ${response.status} ${text}`);
      }

      const data = await response.json();

      if (data.payment_request && !paymentHeaders) {
        // 402 encountered - only set pending payment if we're not retrying
        setPendingPayment(data.payment_request);
        setPendingMessageContent(content);
        // Do NOT add an assistant message yet.
        return;
      }

      if (data.payment_request && paymentHeaders) {
        // Payment headers were sent but still got 402 - backend rejected the payment
        throw new Error("Payment verification failed. Please try again.");
      }

      const reply = data?.reply ?? "No content returned.";

      const assistantMessage: ChatMessage = {
        id: randomId(),
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Clear pending state on success
      setPendingPayment(null);
      setPendingMessageContent(null);
      paymentAttemptCount.current = 0;

    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unexpected error during request.";
      setError(reason);
      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          role: "assistant",
          content: "Something went wrong while contacting the LLM.",
        },
      ]);
    } finally {
      setLoading(false);
      // Only focus if we aren't waiting for payment
      if (!pendingPayment) {
        inputRef.current?.focus();
      }
    }
  }

  async function handlePayment() {
    if (!pendingPayment || !address || !pendingMessageContent) return;

    // Prevent duplicate payment processing
    if (isProcessingPayment.current) {
      console.log("Payment already in progress, skipping duplicate request");
      return;
    }

    // Limit payment attempts to prevent infinite loops
    if (paymentAttemptCount.current >= 3) {
      console.error("❌ Payment failed too many times, stopping attempts");
      setError("Payment failed. Please refresh and try again.");
      setPendingPayment(null);
      setPendingMessageContent(null);
      paymentAttemptCount.current = 0;
      return;
    }

    paymentAttemptCount.current++;
    console.log("🔄 Starting payment process", {
      pendingPayment: !!pendingPayment,
      address,
      isInMiniApp,
      isProcessing: isProcessingPayment.current,
      attempt: paymentAttemptCount.current,
      connectedChain: chain?.id,
      connectedChainName: chain?.name,
    });

    isProcessingPayment.current = true;
    setError(null);

    try {
      // 1. Select requirement (exact scheme, correct network)
      const targetNetwork = import.meta.env.VITE_DEFAULT_NETWORK || "base-sepolia";
      const requirement = pendingPayment.accepts.find(
        (r) => r.scheme === "exact" && r.network === targetNetwork
      );

      if (!requirement) {
        throw new Error(`No supported payment scheme found (need exact on ${targetNetwork})`);
      }

      // 2. Prepare data
      const chainId = getChainId(requirement.network);

      // Verify user is on the correct chain
      if (chain && chain.id !== chainId) {
        throw new Error(
          `Chain mismatch: wallet is on ${chain.name} (${chain.id}), but payment requires ${requirement.network} (${chainId})`
        );
      }

      console.log("✅ Chain verification passed", {
        requiredNetwork: requirement.network,
        requiredChainId: chainId,
        walletChainId: chain?.id,
        walletChainName: chain?.name,
      });

      const nonce = generateNonce();
      const validAfter = BigInt(Math.floor(Date.now() / 1000) - 1800);
      const validBefore = BigInt(
        Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds
      );
      const value = BigInt(requirement.maxAmountRequired);

      // Ensure domain is properly typed for EIP-712
      const domain = {
        name: requirement.extra?.name ?? "USD Coin",
        version: requirement.extra?.version ?? "2",
        chainId: BigInt(chainId),
        verifyingContract: requirement.asset as Address,
      };

      // Message values must be in the correct format for EIP-712 signing
      const message = {
        from: address,
        to: requirement.payTo as Address,
        value: value,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      console.log("🔐 Preparing to sign EIP-712 message", {
        domain: {
          name: domain.name,
          version: domain.version,
          chainId: domain.chainId.toString(),
          verifyingContract: domain.verifyingContract,
        },
        message: {
          from: message.from,
          to: message.to,
          value: message.value.toString(),
          validAfter: message.validAfter.toString(),
          validBefore: message.validBefore.toString(),
          nonce: message.nonce,
        },
        primaryType: "TransferWithAuthorization",
      });

      // 3. Sign with proper EIP-712 typed data
      // Note: wagmi's signTypedDataAsync expects types without EIP712Domain
      const rawSignature = await signTypedDataAsync({
        domain,
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        primaryType: "TransferWithAuthorization",
        message,
      });

      console.log("📝 Raw signature received:", {
        signature: rawSignature,
        length: rawSignature.length,
      });

      // Normalize signature for Smart Wallet compatibility
      const signature = normalizeSignature(rawSignature);

      console.log("✅ Normalized signature:", {
        signature,
        length: signature.length,
      });

      // 4. Construct Header
      const header: X402Header = {
        x402Version: X402_VERSION,
        scheme: "exact",
        network: requirement.network,
        payload: {
          signature,
          authorization: {
            from: address,
            to: requirement.payTo as Address,
            value: value.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };

      console.log("📦 Constructed X402 Header", {
        header,
        encodedPreview: encodeX402Header(header).substring(0, 50) + "...",
      });

      const encodedHeader = encodeX402Header(header);

      console.log("🚀 Sending payment to facilitator", {
        messageContent: pendingMessageContent,
        paymentHeaderLength: encodedHeader.length,
      });

      // 5. Retry Chat
      // We pass the pending content and the new headers
      await sendChat(undefined, pendingMessageContent, {
        "X-Payment": encodedHeader,
      });


      console.log("✅ Payment completed successfully");
      paymentAttemptCount.current = 0;

    } catch (err) {
      console.error("❌ Payment failed:", err);

      // Detailed error logging
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });

        // Check for common issues
        if (err.message.includes('User rejected')) {
          setError("서명을 취소하셨습니다. 다시 시도해주세요.");
        } else if (err.message.includes('Chain mismatch')) {
          setError("지갑의 네트워크를 Base Sepolia로 변경해주세요.");
        } else if (err.message.includes('signature')) {
          setError("서명 생성에 실패했습니다. 지갑 연결을 확인해주세요.");
        } else {
          setError(err.message || "Payment failed");
        }
      } else {
        setError("Unknown error occurred during payment");
      }
    } finally {
      // Reset the flag when payment completes or fails
      console.log("🔓 Resetting payment processing flag");
      isProcessingPayment.current = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void sendChat();
      }
    }
  }

  function resetConversation() {
    setMessages([
      {
        id: randomId(),
        role: "assistant",
        content: "hello! how can I help you?",
      },
    ]);
    setError(null);
    setInput("");
    setPendingPayment(null);
    setPendingMessageContent(null);
    isProcessingPayment.current = false;
    paymentAttemptCount.current = 0;
    inputRef.current?.focus();
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="flex justify-between items-start w-full">
          <div>
            <h1>Infra402</h1>
            <p className="lede">
              Chat with your agent to explore infra402 :D<br />
              Provision containers and pay using x402!
            </p>
            <div className="meta">
              <span>Base URL: {info?.base_url ?? "…"}</span>
              <span>Model: {info?.model_name ?? "…"}</span>
              <span>Build: {BUILD_LABEL}</span>
            </div>
          </div>
          <div className="wallet-container">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <AddressComponent />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
        <div className="hero-actions">
          <button className="ghost" onClick={resetConversation}>
            Reset chat
          </button>
        </div>
      </header>

      <main className="chat-shell">
        <section className="messages" ref={messagesRef}>
          {messages.map((msg) => (
            <article key={msg.id} className={`message ${msg.role}`}>
              <div className="avatar">
                {msg.role === "user" ? "You" : "i402"}
              </div>
              <div className="bubble">
                <div className="markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </article>
          ))}

          {pendingPayment && (
            <article className="message assistant payment-request">
              <div className="avatar">i402</div>
              <div className="bubble payment-bubble">
                <p><strong>💳 Payment Required</strong></p>
                <p>This action requires a micropayment to proceed.</p>

                {pendingPayment.accepts && pendingPayment.accepts.length > 0 && (
                  <div className="payment-details" style={{
                    margin: '12px 0',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Amount:</strong> {(Number(pendingPayment.accepts[0]?.maxAmountRequired || 0) / 1e6).toFixed(4)} USDC
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Network:</strong> {pendingPayment.accepts[0]?.network || 'base-sepolia'}
                    </p>
                  </div>
                )}

                {!isConnected ? (
                  <div style={{ marginTop: '12px' }}>
                    <p className="text-sm mb-2" style={{ color: '#fbbf24' }}>
                      ⚠️ Please connect your wallet to proceed
                    </p>
                    <Wallet>
                      <ConnectWallet>
                        <Avatar className="h-6 w-6" />
                        <Name />
                      </ConnectWallet>
                    </Wallet>
                  </div>
                ) : (
                  <button
                    className="pay-button"
                    onClick={handlePayment}
                    disabled={loading}
                    style={{
                      marginTop: '12px',
                      padding: '10px 20px',
                      background: loading ? '#666' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {loading ? "⏳ Processing..." : "✍️ Sign & Pay"}
                  </button>
                )}
              </div>
            </article>
          )}

          {loading && !pendingPayment && (
            <div className="typing">Model is thinking…</div>
          )}
        </section>

        <form className="composer" onSubmit={(e) => sendChat(e)}>
          <textarea
            ref={inputRef}
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={!!pendingPayment}
          />
          <div className="composer-actions">
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={!canSend}>
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;
