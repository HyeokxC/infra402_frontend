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
import rehypeRaw from "rehype-raw";
import { sdk } from "@farcaster/miniapp-sdk";
import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
    Address as AddressComponent,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from "@coinbase/onchainkit/identity";
import { useAccount, useSignTypedData } from "wagmi";
import { type Address } from "viem";
import {
    encodeX402Header,
    generateNonce,
    getChainId,
    normalizeSignature,
    type PaymentRequest,
    type X402Header,
    X402_VERSION,
} from "../x402";
import { Send, User, Bot, AlertCircle, Loader2 } from "lucide-react";

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
        <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="text-brand-500 hover:text-brand-600 underline"
        >
            {props.children}
        </a>
    ),
    pre: ({ node, ...props }) => (
        <pre
            {...props}
            className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-2 border border-zinc-800"
        >
            {props.children}
        </pre>
    ),
    code: ({ node, className, children, ...props }) => {
        // const match = /language-(\w+)/.exec(className || "");
        return (
            <code
                {...props}
                className={`${className} bg-zinc-800/50 text-zinc-200 px-1.5 py-0.5 rounded text-sm`}
            >
                {children}
            </code>
        );
    },
    table: ({ node, ...props }) => (
        <div className="overflow-x-auto my-4">
            <table {...props} className="min-w-full divide-y divide-zinc-800" />
        </div>
    ),
    th: ({ node, ...props }) => (
        <th
            {...props}
            className="px-3 py-2 bg-zinc-800/50 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
        />
    ),
    td: ({ node, ...props }) => (
        <td
            {...props}
            className="px-3 py-2 whitespace-nowrap text-sm text-zinc-300 border-b border-zinc-800"
        />
    ),
};

const chatApiBase =
    (import.meta.env.VITE_CHAT_API_BASE as string | undefined)?.replace(
        /\/$/,
        ""
    ) || "http://localhost:8000";

function randomId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
    const { address, isConnected, chain } = useAccount();
    const { signTypedDataAsync } = useSignTypedData();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: randomId(),
            role: "assistant",
            content: "Hello! How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<Info | null>(null);
    const [pendingPayment, setPendingPayment] = useState<PaymentRequest | null>(
        null
    );
    const [pendingMessageContent, setPendingMessageContent] = useState<
        string | null
    >(null);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);
    const isProcessingPayment = useRef<boolean>(false);
    const paymentAttemptCount = useRef<number>(0);

    const canSend = useMemo(
        () => Boolean(input.trim()) && !loading && !pendingPayment,
        [input, loading, pendingPayment]
    );

    const isInMiniApp = typeof window !== "undefined" && window.parent !== window;

    useEffect(() => {
        sdk.actions.ready();
    }, []);

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

    // Handle Payment Logic (Copied from original App.tsx)
    useEffect(() => {
        if (
            pendingPayment &&
            isConnected &&
            address &&
            !loading &&
            !isProcessingPayment.current
        ) {
            const timer = setTimeout(() => {
                handlePayment();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isConnected, address, pendingPayment, loading]);

    async function sendChat(
        event?: FormEvent,
        overrideContent?: string,
        paymentHeaders?: Record<string, string>
    ) {
        event?.preventDefault();
        setError(null);

        const content = overrideContent ?? input.trim();
        if (!content) return;
        if (loading) return;

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

        let historyPayload = messages.map(({ role, content: text }) => ({
            role,
            content: text,
        }));

        if (overrideContent) {
            const lastMsg = historyPayload[historyPayload.length - 1];
            if (
                lastMsg &&
                lastMsg.role === "user" &&
                lastMsg.content === overrideContent
            ) {
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
                setPendingPayment(data.payment_request);
                setPendingMessageContent(content);
                return;
            }

            if (data.payment_request && paymentHeaders) {
                throw new Error("Payment verification failed. Please try again.");
            }

            const reply = data?.reply ?? "No content returned.";

            const assistantMessage: ChatMessage = {
                id: randomId(),
                role: "assistant",
                content: reply,
            };

            setMessages((prev) => [...prev, assistantMessage]);
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
            if (!pendingPayment) {
                inputRef.current?.focus();
            }
        }
    }

    async function handlePayment() {
        if (!pendingPayment || !address || !pendingMessageContent) return;

        if (isProcessingPayment.current) {
            return;
        }

        if (paymentAttemptCount.current >= 3) {
            setError("Payment failed. Please refresh and try again.");
            setPendingPayment(null);
            setPendingMessageContent(null);
            paymentAttemptCount.current = 0;
            return;
        }

        paymentAttemptCount.current++;
        isProcessingPayment.current = true;
        setError(null);

        try {
            const targetNetwork =
                import.meta.env.VITE_DEFAULT_NETWORK || "base-sepolia";
            const requirement = pendingPayment.accepts.find(
                (r) => r.scheme === "exact" && r.network === targetNetwork
            );

            if (!requirement) {
                throw new Error(
                    `No supported payment scheme found (need exact on ${targetNetwork})`
                );
            }

            const chainId = getChainId(requirement.network);

            if (chain && chain.id !== chainId) {
                throw new Error(
                    `Chain mismatch: wallet is on ${chain.name} (${chain.id}), but payment requires ${requirement.network} (${chainId})`
                );
            }

            const nonce = generateNonce();
            const validAfter = BigInt(Math.floor(Date.now() / 1000) - 1800);
            const validBefore = BigInt(
                Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds
            );
            const value = BigInt(requirement.maxAmountRequired);

            const domain = {
                name: requirement.extra?.name ?? "USDC",
                version: requirement.extra?.version ?? "2",
                chainId: BigInt(chainId),
                verifyingContract: requirement.asset as Address,
            };

            const message = {
                from: address,
                to: requirement.payTo as Address,
                value: value,
                validAfter: validAfter,
                validBefore: validBefore,
                nonce: nonce,
            };

            const rawSignature = await signTypedDataAsync({
                domain,
                types: {
                    TransferWithAuthorization: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "validAfter", type: "uint256" },
                        { name: "validBefore", type: "uint256" },
                        { name: "nonce", type: "bytes32" },
                    ],
                },
                primaryType: "TransferWithAuthorization",
                message,
            });

            const signature = normalizeSignature(rawSignature);

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

            const encodedHeader = encodeX402Header(header);

            await sendChat(undefined, pendingMessageContent, {
                "X-Payment": encodedHeader,
            });
            paymentAttemptCount.current = 0;
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes("User rejected")) {
                    setError("Signature cancelled. Please try again.");
                } else if (err.message.includes("Chain mismatch")) {
                    setError("Incorrect network. Please switch to Base Sepolia.");
                } else {
                    setError(err.message || "Payment failed");
                }
            } else {
                setError("Unknown error occurred during payment");
            }
        } finally {
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

    return (
        <div className="flex flex-col h-full bg-[#212121]">
            <div className="flex-1 overflow-y-auto p-4" ref={messagesRef}>
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""
                                }`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-zinc-700" : "bg-brand-500"
                                    }`}
                            >
                                {msg.role === "user" ? (
                                    <User className="w-5 h-5 text-zinc-300" />
                                ) : (
                                    <Bot className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div
                                className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"
                                    }`}
                            >
                                <div
                                    className={`px-4 py-3 rounded-2xl ${msg.role === "user"
                                            ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-800 rounded-tr-none"
                                            : "bg-[#2f2f2f] text-zinc-100 rounded-tl-none border border-zinc-700/50"
                                        }`}
                                >
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={markdownComponents}
                                        className="prose prose-invert max-w-none text-sm leading-relaxed"
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}

                    {pendingPayment && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-[#2f2f2f] border border-brand-500/30 rounded-2xl rounded-tl-none p-4 max-w-md w-full">
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="text-xl">💳</span> Payment Required
                                </h3>
                                <p className="text-zinc-300 text-sm mb-4">
                                    This action requires a micropayment to proceed.
                                </p>

                                {pendingPayment.accepts && pendingPayment.accepts.length > 0 && (
                                    <div className="bg-zinc-900/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Amount:</span>
                                            <span className="text-brand-500 font-mono font-bold">
                                                {(
                                                    Number(
                                                        pendingPayment.accepts[0]?.maxAmountRequired || 0
                                                    ) / 1e6
                                                ).toFixed(4)}{" "}
                                                USDC
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Network:</span>
                                            <span className="text-zinc-300">
                                                {pendingPayment.accepts[0]?.network || "base-sepolia"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {!isConnected ? (
                                    <div className="flex flex-col gap-3">
                                        <p className="text-amber-400 text-sm">
                                            ⚠️ Please connect your wallet to proceed
                                        </p>
                                        <Wallet>
                                            <ConnectWallet className="w-full bg-brand-600 hover:bg-brand-500 text-white !rounded-lg">
                                                <Avatar className="h-6 w-6" />
                                                <Name />
                                            </ConnectWallet>
                                        </Wallet>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handlePayment}
                                        disabled={loading}
                                        className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Sign & Pay"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {loading && !pendingPayment && (
                        <div className="flex items-center gap-2 text-zinc-500 text-sm ml-12">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Model is thinking...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-2">
                            <div className="px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-500 rounded-lg text-sm">
                                {error}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-[#212121]">
                <div className="max-w-3xl mx-auto relative">
                    <form
                        onSubmit={(e) => sendChat(e)}
                        className="relative bg-zinc-800 rounded-xl border border-zinc-700 shadow-lg focus-within:ring-1 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all"
                    >
                        <textarea
                            ref={inputRef}
                            placeholder="Ask anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={!!pendingPayment}
                            className="w-full bg-transparent text-white placeholder-zinc-500 p-4 pr-12 min-h-[50px] max-h-[200px] resize-none focus:outline-none rounded-xl"
                            rows={1}
                            style={{ minHeight: "60px" }}
                        />
                        <button
                            type="submit"
                            disabled={!canSend}
                            className="absolute right-2 bottom-2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="text-center mt-2 text-xs text-zinc-500">
                        AI can make mistakes. Please review generated code.
                    </div>
                </div>
            </div>
        </div>
    );
}
