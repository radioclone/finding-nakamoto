"use client";

import { useState } from "react";
import Link from "next/link";

export default function DocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-2">Stacks + Turnkey Integration Guide</h1>
        <p className="text-gray-600">
          Complete guide to implementing Holding Wallets and Trading Wallets with Turnkey
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Table of Contents
        </h2>
        <ol className="space-y-2 text-sm">
          <li>
            <a href="#understanding-wallet-types" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              1. Understanding Wallet Types
            </a>
          </li>
          <li>
            <a href="#holding-wallet" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              2. Part 1: Holding Wallet Implementation
            </a>
          </li>
          <li>
            <a href="#trading-wallet" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              3. Part 2: Trading Wallet Implementation
            </a>
          </li>
          <li>
            <a href="#architecture-comparison" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              4. Architecture Comparison
            </a>
          </li>
          <li>
            <a href="#offchain-data" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              5. Offchain Data, Cron Jobs & Database
            </a>
          </li>
          <li>
            <a href="#best-practices" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              6. Best Practices
            </a>
          </li>
          <li>
            <a href="#resources" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
              7. Resources
            </a>
          </li>
        </ol>
      </nav>

      {/* Overview Section */}
      <section id="understanding-wallet-types" className="mb-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 scroll-mt-20">
        <h2 className="text-3xl font-semibold mb-6">Understanding Wallet Types</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔐</span>
              <h3 className="text-xl font-semibold">Holding Wallet</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              <strong>User-controlled signing</strong> - Users sign transactions in their browser using Turnkey's Passkey or Email authentication
            </p>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Maximum security - user controls private keys</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>User must approve each transaction</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Best for holding assets long-term</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✗</span>
                <span>Requires user interaction for every transaction</span>
              </div>
            </div>

            <div className="border-t border-blue-200 dark:border-blue-700 pt-4">
              <h4 className="text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">Perfect for:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💼</span>
                  <div>
                    <p className="text-sm font-medium">Portfolio Management</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Secure long-term investment holdings</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🏦</span>
                  <div>
                    <p className="text-sm font-medium">Treasury Management</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">DAO & company fund management</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎁</span>
                  <div>
                    <p className="text-sm font-medium">User Withdrawals</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Manual reward & asset withdrawals</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-medium">NFT Collections</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Valuable NFT storage & transfers</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                <a
                  href="https://docs.turnkey.com/sdks/react/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                >
                  <span>📖</span>
                  <span>Turnkey React SDK Docs</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚡</span>
              <h3 className="text-xl font-semibold">Trading Wallet</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              <strong>Backend-automated signing</strong> - Your server signs transactions automatically using delegated credentials
            </p>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Fast automated trading & DCA</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>No user interaction needed</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Perfect for trading bots and automation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Server has signing access (use policies to limit)</span>
              </div>
            </div>

            <div className="border-t border-green-200 dark:border-green-700 pt-4">
              <h4 className="text-sm font-semibold mb-3 text-green-700 dark:text-green-300">Perfect for:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📈</span>
                  <div>
                    <p className="text-sm font-medium">DCA Trading Bots</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Automated dollar-cost averaging</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎮</span>
                  <div>
                    <p className="text-sm font-medium">Gaming & In-App Purchases</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Seamless transactions without pop-ups</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔄</span>
                  <div>
                    <p className="text-sm font-medium">Arbitrage & Market Making</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">High-frequency DEX trading</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-sm font-medium">Automated DeFi Strategies</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">24/7 yield optimization & rebalancing</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-700">
                <a
                  href="https://docs.turnkey.com/concepts/policies/delegated-access-backend#server-side-delegated-access-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline"
                >
                  <span>📖</span>
                  <span>Turnkey Delegated Access Docs</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* When to Use Which */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-center">💡 Decision Guide: Which Wallet Should You Use?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-5 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔐</span>
                <h4 className="font-semibold text-lg">Choose Holding Wallet if:</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>Security is your top priority</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>Users should manually approve every transaction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>Transactions are infrequent (once per day/week)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>Holding high-value assets long-term</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-5 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚡</span>
                <h4 className="font-semibold text-lg">Choose Trading Wallet if:</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">→</span>
                  <span>Speed and automation are essential</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">→</span>
                  <span>Backend needs to execute transactions autonomously</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">→</span>
                  <span>High-frequency trading or gaming transactions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">→</span>
                  <span>Building bots, DeFi strategies, or automated systems</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 inline-block">
              <strong>💎 Pro Tip:</strong> Many apps use BOTH! Keep most funds in a Holding Wallet for security, and maintain a smaller Trading Wallet balance for automated operations.
            </p>
          </div>
        </div>
      </section>

      {/* Holding Wallet Section */}
      <section id="holding-wallet" className="mb-16 scroll-mt-20">
        <div className="border-l-4 border-blue-500 pl-6 mb-8">
          <h2 className="text-3xl font-semibold mb-2">Part 1: Holding Wallet Implementation</h2>
          <p className="text-gray-600">User-controlled wallet with passkey/email authentication</p>
        </div>

        {/* Setup TurnkeyProvider */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 1: Setup TurnkeyProvider</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/providers/TurnkeyProvider.tsx</code>
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            First, configure the Turnkey provider to wrap your application:
          </p>
          <div className="relative bg-gray-900 rounded-lg p-6 mb-4">
            <button
              onClick={() => handleCopy(`"use client";

import { TurnkeyProvider as TurnkeyWalletProvider } from "@turnkey/react-wallet-kit";

export function TurnkeyProvider({ children }: { children: React.ReactNode }) {
  const turnkeyConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
    organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
    authProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID!,
  };

  return (
    <TurnkeyWalletProvider config={turnkeyConfig}>
      {children}
    </TurnkeyWalletProvider>
  );
}`, "turnkey-provider-setup")}
              className="absolute top-4 right-4 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              {copiedId === "turnkey-provider-setup" ? "Copied!" : "Copy"}
            </button>
            <pre className="text-sm overflow-x-auto">
              <span className="text-[#CE9178]">"use client"</span>;{'\n\n'}
              <span className="text-[#C586C0]">import</span> {'{'} <span className="text-[#4EC9B0]">TurnkeyProvider</span> <span className="text-[#C586C0]">as</span> <span className="text-[#4EC9B0]">TurnkeyWalletProvider</span> {'}'} <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">"@turnkey/react-wallet-kit"</span>;{'\n\n'}
              <span className="text-[#C586C0]">export</span> <span className="text-[#C586C0]">function</span> <span className="text-[#DCDCAA]">TurnkeyProvider</span>({'({'}<span className="text-[#9CDCFE]">children</span>{': { '}<span className="text-[#9CDCFE]">children</span>: <span className="text-[#4EC9B0]">React.ReactNode</span> {'}'}) {'{'}{'\n'}
              {'  '}<span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">turnkeyConfig</span> = {'{'}{'\n'}
              {'    '}<span className="text-[#9CDCFE]">apiBaseUrl</span>: <span className="text-[#9CDCFE]">process</span>.<span className="text-[#9CDCFE]">env</span>.<span className="text-[#9CDCFE]">NEXT_PUBLIC_TURNKEY_API_BASE_URL</span>!,{'\n'}
              {'    '}<span className="text-[#9CDCFE]">organizationId</span>: <span className="text-[#9CDCFE]">process</span>.<span className="text-[#9CDCFE]">env</span>.<span className="text-[#9CDCFE]">NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID</span>!,{'\n'}
              {'    '}<span className="text-[#9CDCFE]">authProxyConfigId</span>: <span className="text-[#9CDCFE]">process</span>.<span className="text-[#9CDCFE]">env</span>.<span className="text-[#9CDCFE]">NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID</span>!,{'\n'}
              {'  '}{'}'};{'\n\n'}
              {'  '}<span className="text-[#C586C0]">return</span> ({'\n'}
              {'    '}<span className="text-[#808080]">&lt;</span><span className="text-[#4EC9B0]">TurnkeyWalletProvider</span> <span className="text-[#9CDCFE]">config</span>=<span className="text-[#808080]">{'{'}</span><span className="text-[#9CDCFE]">turnkeyConfig</span><span className="text-[#808080]">{'}'}</span><span className="text-[#808080]">&gt;</span>{'\n'}
              {'      {children}'}{'\n'}
              {'    '}<span className="text-[#808080]">&lt;/</span><span className="text-[#4EC9B0]">TurnkeyWalletProvider</span><span className="text-[#808080]">&gt;</span>{'\n'}
              {'  '});{'\n'}
              {'}'}
            </pre>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded mb-4">
            <h5 className="font-semibold mb-3 text-sm">Required Environment Variables:</h5>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <div>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">NEXT_PUBLIC_TURNKEY_API_BASE_URL</code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Turnkey API base URL (e.g., https://api.turnkey.com)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <div>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID</code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Your Turnkey organization ID</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <div>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID</code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Auth proxy configuration ID for passkey/email authentication</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300">
            Then wrap your app with the provider in your root layout to enable Turnkey context throughout your application.
          </p>
        </div>

        {/* Getting Stacks Address */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 2: Getting Stacks Address from Public Key</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            When a user authenticates with Turnkey, you receive their public key. Convert it to a Stacks address:
          </p>
          <div className="relative bg-gray-900 rounded-lg p-6 mb-4">
            <button
              onClick={() => handleCopy(`import { getAddressFromPublicKey } from "@stacks/transactions";

// Public key from Turnkey (with or without 0x prefix)
const publicKey = "03a1b2c3...";
const network = "testnet"; // or "mainnet"

const stacksAddress = getAddressFromPublicKey(
  publicKey.replace('0x', ''),
  network
);

console.log(stacksAddress); // "ST1ABC..."`, "address-conversion")}
              className="absolute top-4 right-4 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              {copiedId === "address-conversion" ? "Copied!" : "Copy"}
            </button>
            <pre className="text-sm overflow-x-auto">
              <span className="text-[#C586C0]">import</span> {'{'} <span className="text-[#DCDCAA]">getAddressFromPublicKey</span> {'}'} <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">"@stacks/transactions"</span>;{'\n\n'}
              <span className="text-[#6A9955]">// Public key from Turnkey (with or without 0x prefix)</span>{'\n'}
              <span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">publicKey</span> = <span className="text-[#CE9178]">"03a1b2c3..."</span>;{'\n'}
              <span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">network</span> = <span className="text-[#CE9178]">"testnet"</span>; <span className="text-[#6A9955]">// or "mainnet"</span>{'\n\n'}
              <span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">stacksAddress</span> = <span className="text-[#DCDCAA]">getAddressFromPublicKey</span>({'\n'}
              {'  '}<span className="text-[#9CDCFE]">publicKey</span>.<span className="text-[#DCDCAA]">replace</span>(<span className="text-[#CE9178]">'0x'</span>, <span className="text-[#CE9178]">''</span>),{'\n'}
              {'  '}<span className="text-[#9CDCFE]">network</span>{'\n'}
              );{'\n\n'}
              <span className="text-[#9CDCFE]">console</span>.<span className="text-[#DCDCAA]">log</span>(<span className="text-[#9CDCFE]">stacksAddress</span>); <span className="text-[#6A9955]">// "ST1ABC..."</span>
            </pre>
          </div>
        </div>

        {/* 4 Steps to Sign */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 3: Sign a Transaction (4 Sub-steps)</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/utils/core/signingUtils.ts</code>
          </p>

          {/* Step 1 */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">1</span>
              <h4 className="text-xl font-semibold">Create Unsigned Transaction</h4>
            </div>
            <div className="relative">
              <button
                onClick={() => handleCopy(`import { makeUnsignedSTXTokenTransfer } from "@stacks/transactions";

const transaction = await makeUnsignedSTXTokenTransfer({
  recipient: "ST1ABC...",
  amount: 1000000n, // 1 STX in microSTX
  publicKey: "03a1b2c3...",
  network: "testnet",
  fee: 10000n,
  nonce: 0n
});`, "step1")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                {copiedId === "step1" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                <span className="text-[#C586C0]">import</span> {'{'} <span className="text-[#DCDCAA]">makeUnsignedSTXTokenTransfer</span> {'}'} <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">"@stacks/transactions"</span>;{'\n\n'}
                <span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">transaction</span> = <span className="text-[#C586C0]">await</span> <span className="text-[#DCDCAA]">makeUnsignedSTXTokenTransfer</span>({'({'}{'\n'}
                {'  '}<span className="text-[#9CDCFE]">recipient</span>: <span className="text-[#CE9178]">"ST1ABC..."</span>,{'\n'}
                {'  '}<span className="text-[#9CDCFE]">amount</span>: <span className="text-[#B5CEA8]">1000000n</span>, <span className="text-[#6A9955]">// 1 STX in microSTX</span>{'\n'}
                {'  '}<span className="text-[#9CDCFE]">publicKey</span>: <span className="text-[#CE9178]">"03a1b2c3..."</span>,{'\n'}
                {'  '}<span className="text-[#9CDCFE]">network</span>: <span className="text-[#CE9178]">"testnet"</span>,{'\n'}
                {'  '}<span className="text-[#9CDCFE]">fee</span>: <span className="text-[#B5CEA8]">10000n</span>,{'\n'}
                {'  '}<span className="text-[#9CDCFE]">nonce</span>: <span className="text-[#B5CEA8]">0n</span>{'\n'}
                {'});'}
              </pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">2</span>
              <h4 className="text-xl font-semibold">Generate Pre-Sign Hash</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              The pre-sign hash includes auth type, fee, and nonce - this is what Turnkey will sign.
            </p>
            <div className="relative">
              <button
                onClick={() => handleCopy(`import { sigHashPreSign, TransactionSigner } from "@stacks/transactions";

export function generatePreSignSigHash(transaction) {
  const signer = new TransactionSigner(transaction);

  const preSignSigHash = sigHashPreSign(
    signer.sigHash,
    transaction.auth.authType,
    transaction.auth.spendingCondition.fee,
    transaction.auth.spendingCondition.nonce
  );

  return preSignSigHash;
}`, "step2")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                {copiedId === "step2" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                <span className="text-[#C586C0]">import</span> {'{'} <span className="text-[#DCDCAA]">sigHashPreSign</span>, <span className="text-[#4EC9B0]">TransactionSigner</span> {'}'} <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">"@stacks/transactions"</span>;{'\n\n'}
                <span className="text-[#C586C0]">export</span> <span className="text-[#C586C0]">function</span> <span className="text-[#DCDCAA]">generatePreSignSigHash</span>(<span className="text-[#9CDCFE]">transaction</span>) {'{'}{'\n'}
                {'  '}<span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">signer</span> = <span className="text-[#C586C0]">new</span> <span className="text-[#4EC9B0]">TransactionSigner</span>(<span className="text-[#9CDCFE]">transaction</span>);{'\n\n'}
                {'  '}<span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">preSignSigHash</span> = <span className="text-[#DCDCAA]">sigHashPreSign</span>({'\n'}
                {'    '}<span className="text-[#9CDCFE]">signer</span>.<span className="text-[#9CDCFE]">sigHash</span>,{'\n'}
                {'    '}<span className="text-[#9CDCFE]">transaction</span>.<span className="text-[#9CDCFE]">auth</span>.<span className="text-[#9CDCFE]">authType</span>,{'\n'}
                {'    '}<span className="text-[#9CDCFE]">transaction</span>.<span className="text-[#9CDCFE]">auth</span>.<span className="text-[#9CDCFE]">spendingCondition</span>.<span className="text-[#9CDCFE]">fee</span>,{'\n'}
                {'    '}<span className="text-[#9CDCFE]">transaction</span>.<span className="text-[#9CDCFE]">auth</span>.<span className="text-[#9CDCFE]">spendingCondition</span>.<span className="text-[#9CDCFE]">nonce</span>{'\n'}
                {'  '});{'\n\n'}
                {'  '}<span className="text-[#C586C0]">return</span> <span className="text-[#9CDCFE]">preSignSigHash</span>;{'\n'}
                {'}'}
              </pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">3</span>
              <h4 className="text-xl font-semibold">Sign with Turnkey (Browser)</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              User signs the hash in their browser using Turnkey's httpClient:
            </p>
            <div className="relative">
              <button
                onClick={() => handleCopy(`// In your React component with Turnkey context
const { httpClient } = useTurnkey();

const preSignSigHash = generatePreSignSigHash(transaction);

// Add 0x prefix if not present
const payload = preSignSigHash.startsWith("0x")
  ? preSignSigHash
  : \`0x\${preSignSigHash}\`;

const signature = await httpClient.signRawPayload({
  signWith: publicKey,
  payload: payload,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP"
});

// Format signature: V + R + S (130 chars)
// Turnkey already provides correct V, just pad r and s
const vrsSignature = \`\${signature.v}\${signature.r.padStart(64, "0")}\${signature.s.padStart(64, "0")}\`;`, "step3")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                {copiedId === "step3" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">
{`// In your React component with Turnkey context
const { httpClient } = useTurnkey();

const preSignSigHash = generatePreSignSigHash(transaction);

// Add 0x prefix if not present
const payload = preSignSigHash.startsWith("0x")
  ? preSignSigHash
  : \`0x\${preSignSigHash}\`;

const signature = await httpClient.signRawPayload({
  signWith: publicKey,
  payload: payload,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP"
});

// Format signature: V + R + S (130 chars)
// Turnkey already provides correct V, just pad r and s
const vrsSignature = \`\${signature.v}\${signature.r.padStart(64, "0")}\${signature.s.padStart(64, "0")}\`;`}
              </pre>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">4</span>
              <h4 className="text-xl font-semibold">Attach Signature and Broadcast</h4>
            </div>
            <div className="relative">
              <button
                onClick={() => handleCopy(`import {
  createMessageSignature,
  broadcastTransaction,
  SingleSigSpendingCondition
} from "@stacks/transactions";

// Attach signature to transaction
const messageSignature = createMessageSignature(vrsSignature);
(transaction.auth.spendingCondition as SingleSigSpendingCondition)
  .signature = messageSignature;

// Broadcast to network
const result = await broadcastTransaction({
  transaction: transaction,
  network: "testnet"
});

console.log("Transaction ID:", result.txid);`, "step4")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                {copiedId === "step4" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">
{`import {
  createMessageSignature,
  broadcastTransaction,
  SingleSigSpendingCondition
} from "@stacks/transactions";

// Attach signature to transaction
const messageSignature = createMessageSignature(vrsSignature);
(transaction.auth.spendingCondition as SingleSigSpendingCondition)
  .signature = messageSignature;

// Broadcast to network
const result = await broadcastTransaction({
  transaction: transaction,
  network: "testnet"
});

console.log("Transaction ID:", result.txid);`}
              </pre>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
            <p className="text-sm">
              <strong>💡 Recovery ID Testing:</strong> If signature verification fails, use <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">broadcastWithRecoveryTesting()</code> from signingUtils.ts to automatically try all recovery IDs (00, 01, 02, 03) until one succeeds.
            </p>
          </div>
        </div>
      </section>

      {/* Trading Wallet Section */}
      <section id="trading-wallet" className="mb-16 scroll-mt-20">
        <div className="border-l-4 border-green-500 pl-6 mb-8">
          <h2 className="text-3xl font-semibold mb-2">Part 2: Trading Wallet Implementation</h2>
          <p className="text-gray-600">Backend-automated signing with delegated credentials</p>
        </div>

        {/* Step 1: Initialize SDK */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 1: Initialize Turnkey Server SDK</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/lib/turnkey/client.ts</code>
          </p>
          <div className="relative">
            <button
              onClick={() => handleCopy(`import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";

export const getTurnkeyClient = () => {
  if (!process.env.TURNKEY_BASE_URL) {
    throw new Error("TURNKEY_BASE_URL is not configured");
  }
  if (!process.env.TURNKEY_API_PRIVATE_KEY) {
    throw new Error("TURNKEY_API_PRIVATE_KEY is not configured");
  }
  if (!process.env.TURNKEY_API_PUBLIC_KEY) {
    throw new Error("TURNKEY_API_PUBLIC_KEY is not configured");
  }
  if (!process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID) {
    throw new Error("NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID is not configured");
  }

  return new TurnkeyServerSDK({
    apiBaseUrl: process.env.TURNKEY_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID,
  });
};`, "trading-step1")}
              className="absolute top-4 right-4 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              {copiedId === "trading-step1" ? "Copied!" : "Copy"}
            </button>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-6 text-sm overflow-x-auto mb-4">
{`import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";

export const getTurnkeyClient = () => {
  if (!process.env.TURNKEY_BASE_URL) {
    throw new Error("TURNKEY_BASE_URL is not configured");
  }
  if (!process.env.TURNKEY_API_PRIVATE_KEY) {
    throw new Error("TURNKEY_API_PRIVATE_KEY is not configured");
  }
  if (!process.env.TURNKEY_API_PUBLIC_KEY) {
    throw new Error("TURNKEY_API_PUBLIC_KEY is not configured");
  }
  if (!process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID) {
    throw new Error("NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID is not configured");
  }

  return new TurnkeyServerSDK({
    apiBaseUrl: process.env.TURNKEY_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID,
  });
};`}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h5 className="font-semibold mb-3">Required Environment Variables:</h5>
            <div className="grid md:grid-cols-2 gap-2 text-sm font-mono">
              <div>• TURNKEY_BASE_URL</div>
              <div>• TURNKEY_API_PRIVATE_KEY</div>
              <div>• TURNKEY_API_PUBLIC_KEY</div>
              <div>• NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID</div>
              <div>• TURNKEY_DELEGATED_API_PUBLIC_KEY</div>
              <div>• TURNKEY_DELEGATED_API_PRIVATE_KEY</div>
            </div>
          </div>
        </div>

        {/* Step 2: Setup Delegate */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 2: Setup Delegated User Access</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/api/turnkey/grant-access/route.ts</code>
          </p>

          {/* Understanding Delegation Model */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔑</span>
              <h4 className="text-xl font-semibold text-amber-900 dark:text-amber-100">Understanding the Delegation Model</h4>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              This is the <strong>most critical concept</strong> for Trading Wallets. When users log into Turnkey, they automatically get their own personal organization that your backend <strong>cannot access</strong>. To enable automated signing, we need a shared space where both your backend and the user have access.
            </p>

            {/* Visual Diagram */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
              <h5 className="font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">Organization Structure</h5>

              {/* Diagram */}
              <div className="space-y-6">
                {/* Parent Org */}
                <div className="text-center">
                  <div className="inline-block bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-400 dark:border-purple-600 rounded-lg px-6 py-3">
                    <div className="font-semibold text-purple-900 dark:text-purple-100">🏢 Your Parent Organization</div>
                    <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">(Root access via API keys)</div>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-2xl text-gray-400">↓</div>

                {/* Two columns: User's Org (blocked) vs Shared Sub-Org (allowed) */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left: User's Personal Org (Can't Access) */}
                  <div className="relative">
                    <div className="absolute -top-3 -left-3 -right-3 -bottom-3 bg-red-100 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-lg opacity-50"></div>
                    <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
                      <div className="text-center mb-3">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">👤 User's Personal Org</div>
                        <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">❌ Backend Can't Access</div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                        <div className="flex items-start gap-2">
                          <span>•</span>
                          <span>Auto-created on user login</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span>•</span>
                          <span>User is the only root user</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span>•</span>
                          <span>Backend has NO access</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-semibold">Can't use for Trading Wallet</span>
                    </div>
                  </div>

                  {/* Right: Shared Sub-Org (Can Access) */}
                  <div className="relative">
                    <div className="absolute -top-3 -left-3 -right-3 -bottom-3 bg-green-100 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-lg opacity-50"></div>
                    <div className="relative bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-600 rounded-lg p-4">
                      <div className="text-center mb-3">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">🤝 Shared Sub-Organization</div>
                        <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">✓ Backend CAN Access</div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                        <div className="flex items-start gap-2">
                          <span>•</span>
                          <span><strong>Two root users:</strong></span>
                        </div>
                        <div className="ml-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400">1.</span>
                            <span><strong>Delegated User</strong> (Backend)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400">2.</span>
                            <span><strong>End User</strong> (Customer)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span>•</span>
                          <div className="flex-1">
                            <span><strong>Backend can sign with policies:</strong></span>
                            <div className="mt-2 bg-gray-900 rounded p-2">
                              <pre className="text-[10px] overflow-x-auto">
                                <span className="text-[#C586C0]">const</span> <span className="text-[#9CDCFE]">policy</span> = <span className="text-[#C586C0]">await</span> <span className="text-[#9CDCFE]">delegatedClient</span>.<span className="text-[#DCDCAA]">createPolicy</span>({'{'}{'\n'}
                                {'  '}<span className="text-[#9CDCFE]">policyName</span>: <span className="text-[#CE9178]">"Delegated Operator Policy"</span>,{'\n'}
                                {'  '}<span className="text-[#9CDCFE]">effect</span>: <span className="text-[#CE9178]">"EFFECT_ALLOW"</span>,{'\n'}
                                {'  '}<span className="text-[#9CDCFE]">consensus</span>: <span className="text-[#CE9178]">`approvers.any(user, user.id == '${'$'}{'{'}delegatedUserId{'}'}')`</span>,{'\n'}
                                {'  '}<span className="text-[#9CDCFE]">condition</span>: <span className="text-[#CE9178]">"true"</span>{'\n'}
                                {'}'});
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trading Wallet inside Sub-Org */}
                      <div className="border-t-2 border-dashed border-green-300 dark:border-green-600 pt-3">
                        <div className="text-center">
                          <div className="inline-block bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-2 border-green-600 dark:border-green-500 rounded-lg px-4 py-3">
                            <div className="font-semibold text-green-900 dark:text-green-100 text-sm">⚡ Trading Wallet</div>
                            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                              <div>Backend can sign automatically</div>
                              <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded text-xs font-semibold">With Policies</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-semibold">✓ Perfect for Trading Wallet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Points */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-amber-300 dark:border-amber-700">
              <h5 className="font-semibold mb-3 text-amber-900 dark:text-amber-100">🎯 Key Points:</h5>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">1.</span>
                  <span><strong>User's personal org is isolated</strong> - Your backend root user cannot access wallets in the user's personal organization.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">2.</span>
                  <span><strong>Create a shared sub-organization</strong> - This is a mutual space where BOTH the delegated user (your backend) AND the end user are root users.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">3.</span>
                  <span><strong>Add delegated credentials</strong> - Your backend uses special API keys (delegated credentials) to act as a root user in the sub-org.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">4.</span>
                  <span><strong>Create signing policies</strong> - Policies define what actions the delegated user can perform (e.g., sign transactions with specific wallets).</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">5.</span>
                  <span><strong>Create wallet in sub-org</strong> - The trading wallet is created inside the shared sub-org, allowing your backend to sign transactions on behalf of the user.</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold">
                💡 This architecture ensures both security (user maintains control) and automation (backend can sign without user interaction).
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Sub-step 2.1 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-3">2.1: Create Sub-Organization with Delegated User</h4>
              <div className="relative">
                <button
                  onClick={() => handleCopy(`const parentClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: PARENT_API_PRIVATE_KEY,
  apiPublicKey: PARENT_API_PUBLIC_KEY,
  defaultOrganizationId: PARENT_ORGANIZATION_ID,
}).apiClient();

// Define users for sub-org: delegated operator + end user
const rootUsers = [
  {
    userName: "Delegated Operator",
    userTags: [],
    apiKeys: [{
      apiKeyName: "Delegated API Key",
      publicKey: DELEGATED_PUBLIC_KEY,
      curveType: "API_KEY_CURVE_P256" as const,
    }],
    authenticators: [],
    oauthProviders: [],
  },
  {
    userName: currentUser.userName,
    userEmail: currentUser.userEmail,
    userTags: currentUser.userTags ?? [],
    apiKeys: [],
    authenticators: [],
    oauthProviders: [],
  },
];

const createSubOrgResponse = await parentClient.createSubOrganization({
  organizationId: PARENT_ORGANIZATION_ID,
  subOrganizationName: \`trading-org-\${sanitizedUserId}_\${Date.now()}\`,
  rootUsers,
  rootQuorumThreshold: 1,
});

const subOrganizationId = createSubOrgResponse.subOrganizationId;
const delegatedUserId = createSubOrgResponse.rootUserIds[0];`, "trading-step2-1")}
                  className="absolute top-2 right-2 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  {copiedId === "trading-step2-1" ? "Copied!" : "Copy"}
                </button>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">
{`const parentClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: PARENT_API_PRIVATE_KEY,
  apiPublicKey: PARENT_API_PUBLIC_KEY,
  defaultOrganizationId: PARENT_ORGANIZATION_ID,
}).apiClient();

// Define users for sub-org: delegated operator + end user
const rootUsers = [
  {
    userName: "Delegated Operator",
    userTags: [],
    apiKeys: [{
      apiKeyName: "Delegated API Key",
      publicKey: DELEGATED_PUBLIC_KEY,
      curveType: "API_KEY_CURVE_P256" as const,
    }],
    authenticators: [],
    oauthProviders: [],
  },
  {
    userName: currentUser.userName,
    userEmail: currentUser.userEmail,
    userTags: currentUser.userTags ?? [],
    apiKeys: [],
    authenticators: [],
    oauthProviders: [],
  },
];

const createSubOrgResponse = await parentClient.createSubOrganization({
  organizationId: PARENT_ORGANIZATION_ID,
  subOrganizationName: \`trading-org-\${sanitizedUserId}_\${Date.now()}\`,
  rootUsers,
  rootQuorumThreshold: 1,
});

const subOrganizationId = createSubOrgResponse.subOrganizationId;
const delegatedUserId = createSubOrgResponse.rootUserIds[0];`}
                </pre>
              </div>
            </div>

            {/* Sub-step 2.2 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-3">2.2: Create Signing Policy</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Create a policy that allows the delegated user to sign transactions:
              </p>
              <div className="relative">
                <button
                  onClick={() => handleCopy(`const delegatedClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: DELEGATED_PRIVATE_KEY,
  apiPublicKey: DELEGATED_PUBLIC_KEY,
  defaultOrganizationId: subOrganizationId,
}).apiClient();

const consensus = \`approvers.any(user, user.id == '\${delegatedUserId}')\`;
const condition = "true";

const createPolicyResponse = await delegatedClient.createPolicy({
  policyName: "Delegated Operator Policy",
  effect: "EFFECT_ALLOW",
  condition,
  consensus,
  notes: "Auto-generated policy for delegated operator to sign with all wallets",
});

console.log("Policy created:", createPolicyResponse.policyId);`, "trading-step2-2")}
                  className="absolute top-2 right-2 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  {copiedId === "trading-step2-2" ? "Copied!" : "Copy"}
                </button>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">
{`const delegatedClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: DELEGATED_PRIVATE_KEY,
  apiPublicKey: DELEGATED_PUBLIC_KEY,
  defaultOrganizationId: subOrganizationId,
}).apiClient();

const consensus = \`approvers.any(user, user.id == '\${delegatedUserId}')\`;
const condition = "true";

const createPolicyResponse = await delegatedClient.createPolicy({
  policyName: "Delegated Operator Policy",
  effect: "EFFECT_ALLOW",
  condition,
  consensus,
  notes: "Auto-generated policy for delegated operator to sign with all wallets",
});

console.log("Policy created:", createPolicyResponse.policyId);`}
                </pre>
              </div>
            </div>

            {/* Sub-step 2.3 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-3">2.3: Create Trading Wallet</h4>
              <div className="relative">
                <button
                  onClick={() => handleCopy(`const STACKS_ACCOUNT_PARAMS = {
  curve: "CURVE_SECP256K1" as const,
  pathFormat: "PATH_FORMAT_BIP32" as const,
  path: "m/44'/5757'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_COMPRESSED" as const,
};

const createWalletResponse = await delegatedClient.createWallet({
  organizationId: subOrganizationId,
  walletName: "Trading Wallet",
  accounts: [STACKS_ACCOUNT_PARAMS],
});

const walletId = createWalletResponse.walletId;
const addresses = createWalletResponse.addresses ?? [];

console.log("Trading wallet created:", walletId);
console.log("Addresses:", addresses);`, "trading-step2-3")}
                  className="absolute top-2 right-2 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  {copiedId === "trading-step2-3" ? "Copied!" : "Copy"}
                </button>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">
{`const STACKS_ACCOUNT_PARAMS = {
  curve: "CURVE_SECP256K1" as const,
  pathFormat: "PATH_FORMAT_BIP32" as const,
  path: "m/44'/5757'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_COMPRESSED" as const,
};

const createWalletResponse = await delegatedClient.createWallet({
  organizationId: subOrganizationId,
  walletName: "Trading Wallet",
  accounts: [STACKS_ACCOUNT_PARAMS],
});

const walletId = createWalletResponse.walletId;
const addresses = createWalletResponse.addresses ?? [];

console.log("Trading wallet created:", walletId);
console.log("Addresses:", addresses);`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Sign Transactions */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 3: Sign Transactions with Delegated Credentials</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/api/stacks/send-stx/route.ts</code>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Your backend can now sign transactions automatically - no user interaction needed:
          </p>
          <div className="relative">
            <button
              onClick={() => handleCopy(`// Initialize delegated client
const delegatedClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: DELEGATED_PRIVATE_KEY,
  apiPublicKey: DELEGATED_PUBLIC_KEY,
  defaultOrganizationId: organizationId,
}).apiClient();

// Create unsigned transaction
const transaction = await makeUnsignedSTXTokenTransfer({
  publicKey,
  recipient: recipientAddress,
  amount,
  fee,
  network,
  nonce
});

// Generate pre-sign hash
const signer = new TransactionSigner(transaction);
const preSignSigHash = sigHashPreSign(
  signer.sigHash,
  transaction.auth.authType,
  transaction.auth.spendingCondition.fee,
  transaction.auth.spendingCondition.nonce
);
const payload = \`0x\${preSignSigHash}\`;

// Sign with delegated credentials (no user interaction!)
const signature = await delegatedClient.signRawPayload({
  organizationId: organizationId,
  payload,
  signWith: publicKey,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP",
});

// Format and attach signature
const formattedSignature = \`\${signature.v}\${signature.r.padStart(64, "0")}\${signature.s.padStart(64, "0")}\`;
const spendingCondition = transaction.auth.spendingCondition as SingleSigSpendingCondition;
spendingCondition.signature = createMessageSignature(formattedSignature);

// Broadcast transaction
const broadcastResult = await broadcastTransaction({
  transaction: transaction,
  network,
});

console.log("Transaction ID:", broadcastResult.txid);`, "trading-step3")}
              className="absolute top-4 right-4 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              {copiedId === "trading-step3" ? "Copied!" : "Copy"}
            </button>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-6 text-sm overflow-x-auto">
{`// Initialize delegated client
const delegatedClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: DELEGATED_PRIVATE_KEY,
  apiPublicKey: DELEGATED_PUBLIC_KEY,
  defaultOrganizationId: organizationId,
}).apiClient();

// Create unsigned transaction
const transaction = await makeUnsignedSTXTokenTransfer({
  publicKey,
  recipient: recipientAddress,
  amount,
  fee,
  network,
  nonce
});

// Generate pre-sign hash
const signer = new TransactionSigner(transaction);
const preSignSigHash = sigHashPreSign(
  signer.sigHash,
  transaction.auth.authType,
  transaction.auth.spendingCondition.fee,
  transaction.auth.spendingCondition.nonce
);
const payload = \`0x\${preSignSigHash}\`;

// Sign with delegated credentials (no user interaction!)
const signature = await delegatedClient.signRawPayload({
  organizationId: organizationId,
  payload,
  signWith: publicKey,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP",
});

// Format and attach signature
const formattedSignature = \`\${signature.v}\${signature.r.padStart(64, "0")}\${signature.s.padStart(64, "0")}\`;
const spendingCondition = transaction.auth.spendingCondition as SingleSigSpendingCondition;
spendingCondition.signature = createMessageSignature(formattedSignature);

// Broadcast transaction
const broadcastResult = await broadcastTransaction({
  transaction: transaction,
  network,
});

console.log("Transaction ID:", broadcastResult.txid);`}
            </pre>
          </div>
        </div>

        {/* Step 4: Organization Management */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Step 4: Organization Management (Optional)</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/trading-wallet/page.tsx</code>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            For production use, implement organization name structure and offline caching:
          </p>
          <div className="relative">
            <button
              onClick={() => handleCopy(`// Naming convention for sub-organizations
const sanitizedUserId = userId.replace(/@/g, "_").replace(/\\./g, "_");
const subOrgName = \`trading-org-\${sanitizedUserId}_\${Date.now()}\`;

// Cache organization data in database or localStorage
interface CachedOrgData {
  subOrganizationId: string;
  delegatedUserId: string;
  walletId: string;
  addresses: string[];
  publicKey: string;
  stacksAddress: string;
  createdAt: number;
}

// Store for offline access
localStorage.setItem(\`trading-org-\${userId}\`, JSON.stringify({
  subOrganizationId,
  delegatedUserId,
  walletId,
  addresses,
  publicKey,
  stacksAddress,
  createdAt: Date.now()
}));

// Retrieve cached data
const cached = localStorage.getItem(\`trading-org-\${userId}\`);
if (cached) {
  const orgData = JSON.parse(cached) as CachedOrgData;
  console.log("Using cached organization:", orgData.subOrganizationId);
}`, "trading-step4")}
              className="absolute top-4 right-4 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              {copiedId === "trading-step4" ? "Copied!" : "Copy"}
            </button>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-6 text-sm overflow-x-auto">
{`// Naming convention for sub-organizations
const sanitizedUserId = userId.replace(/@/g, "_").replace(/\\./g, "_");
const subOrgName = \`trading-org-\${sanitizedUserId}_\${Date.now()}\`;

// Cache organization data in database or localStorage
interface CachedOrgData {
  subOrganizationId: string;
  delegatedUserId: string;
  walletId: string;
  addresses: string[];
  publicKey: string;
  stacksAddress: string;
  createdAt: number;
}

// Store for offline access
localStorage.setItem(\`trading-org-\${userId}\`, JSON.stringify({
  subOrganizationId,
  delegatedUserId,
  walletId,
  addresses,
  publicKey,
  stacksAddress,
  createdAt: Date.now()
}));

// Retrieve cached data
const cached = localStorage.getItem(\`trading-org-\${userId}\`);
if (cached) {
  const orgData = JSON.parse(cached) as CachedOrgData;
  console.log("Using cached organization:", orgData.subOrganizationId);
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="architecture-comparison" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-semibold mb-6">Architecture Comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-300 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Feature</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Holding Wallet</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Trading Wallet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 font-medium">Signing Location</td>
                <td className="px-6 py-4">Browser (user's device)</td>
                <td className="px-6 py-4">Backend server</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">User Interaction</td>
                <td className="px-6 py-4">Required for each tx</td>
                <td className="px-6 py-4">Not required</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">Speed</td>
                <td className="px-6 py-4">Depends on user</td>
                <td className="px-6 py-4">Instant</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">Security Model</td>
                <td className="px-6 py-4">User has full control</td>
                <td className="px-6 py-4">Delegated to server (with policies)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">Use Cases</td>
                <td className="px-6 py-4">Cold storage, manual transfers</td>
                <td className="px-6 py-4">Trading bots, DeFi, automation</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">Turnkey SDK</td>
                <td className="px-6 py-4">@turnkey/sdk-browser</td>
                <td className="px-6 py-4">@turnkey/sdk-server</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium">Organization Structure</td>
                <td className="px-6 py-4">User's personal org</td>
                <td className="px-6 py-4">Sub-org with delegated access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

     

      {/* Offchain Data Section */}
      <section id="offchain-data" className="mb-12 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-2xl p-8 scroll-mt-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🗄️</span>
          <h2 className="text-3xl font-semibold">Offchain Data, Cron Jobs & Database</h2>
        </div>

        {/* Problem Statement */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border-2 border-cyan-200 dark:border-cyan-700">
          <h3 className="text-xl font-semibold mb-4 text-cyan-900 dark:text-cyan-100">⚠️ The API Rate Limit Challenge</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            While you <strong>can</strong> query Turnkey's API directly using <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/api/turnkey/get-trading-orgs</code> to fetch all sub-organizations in real-time, this approach has a critical limitation:
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              🚨 Turnkey API has rate limits. If you have many users or need to query frequently (dashboards, analytics, list views), you'll quickly hit those limits and your app will be throttled.
            </p>
          </div>
        </div>

        {/* Solution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border-2 border-teal-200 dark:border-teal-700">
          <h3 className="text-xl font-semibold mb-4 text-teal-900 dark:text-teal-100">✅ The Solution: Offchain Caching</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/app/api/cron/fetchSubOrgs/route.ts</code>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Instead of hitting Turnkey's API every time you need data, we use a <strong>scheduled cron job</strong> that:
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-teal-600 dark:text-teal-400 font-bold">1.</span>
              <span className="text-gray-700 dark:text-gray-300">Fetches all sub-organizations, wallets, and accounts from Turnkey API periodically (e.g., every 5-10 minutes)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal-600 dark:text-teal-400 font-bold">2.</span>
              <span className="text-gray-700 dark:text-gray-300">Caches the data in your local database (PostgreSQL or SQLite)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal-600 dark:text-teal-400 font-bold">3.</span>
              <span className="text-gray-700 dark:text-gray-300">Your app queries the local database instead of Turnkey, making it blazing fast and free from rate limits</span>
            </div>
          </div>
        </div>

        {/* When to Use What */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">When to Use Which Approach?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-5 border border-teal-300 dark:border-teal-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🗄️</span>
                <h4 className="font-semibold">Offchain (Cached Database)</h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <code className="bg-teal-100 dark:bg-teal-800 px-2 py-1 rounded">Query local database</code>
              </p>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span>
                  <span>Dashboards & analytics</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span>
                  <span>List views with many users</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span>
                  <span>Frequent queries (every page load)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span>
                  <span>Fast response times needed</span>
                </div>
              </div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-5 border border-cyan-300 dark:border-cyan-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔌</span>
                <h4 className="font-semibold">Onchain (Direct Turnkey API)</h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <code className="bg-cyan-100 dark:bg-cyan-800 px-2 py-1 rounded">/api/turnkey/get-trading-orgs</code>
              </p>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-600">✓</span>
                  <span>Real-time accuracy required</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-600">✓</span>
                  <span>Admin operations</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-600">✓</span>
                  <span>Infrequent queries</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-600">✓</span>
                  <span>Single-user lookups</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Schema */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-700">
          <h3 className="text-xl font-semibold mb-4 text-indigo-900 dark:text-indigo-100">📊 Database Schema</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Reference: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">src/lib/db/schema.ts</code>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            The cron job caches data in three tables. Use the SQL below to create them:
          </p>

          {/* Tabs for PostgreSQL and SQLite */}
          <div className="mb-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  const pgTab = document.getElementById('sql-postgres-tab');
                  const sqliteTab = document.getElementById('sql-sqlite-tab');
                  const pgContent = document.getElementById('sql-postgres-content');
                  const sqliteContent = document.getElementById('sql-sqlite-content');
                  if (pgTab && sqliteTab && pgContent && sqliteContent) {
                    pgTab.className = 'px-4 py-2 rounded-t-lg font-semibold text-sm bg-indigo-600 text-white';
                    sqliteTab.className = 'px-4 py-2 rounded-t-lg font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                    pgContent.style.display = 'block';
                    sqliteContent.style.display = 'none';
                  }
                }}
                id="sql-postgres-tab"
                className="px-4 py-2 rounded-t-lg font-semibold text-sm bg-indigo-600 text-white"
              >
                PostgreSQL
              </button>
              <button
                onClick={() => {
                  const pgTab = document.getElementById('sql-postgres-tab');
                  const sqliteTab = document.getElementById('sql-sqlite-tab');
                  const pgContent = document.getElementById('sql-postgres-content');
                  const sqliteContent = document.getElementById('sql-sqlite-content');
                  if (pgTab && sqliteTab && pgContent && sqliteContent) {
                    pgTab.className = 'px-4 py-2 rounded-t-lg font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                    sqliteTab.className = 'px-4 py-2 rounded-t-lg font-semibold text-sm bg-indigo-600 text-white';
                    pgContent.style.display = 'none';
                    sqliteContent.style.display = 'block';
                  }
                }}
                id="sql-sqlite-tab"
                className="px-4 py-2 rounded-t-lg font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                SQLite
              </button>
            </div>

            {/* PostgreSQL Content */}
            <div id="sql-postgres-content" className="relative">
              <button
                onClick={() => handleCopy(`-- Trading Organizations Table
CREATE TABLE trading_organizations (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_orgs_user_id_idx ON trading_organizations(user_id);

-- Trading Wallets Table
CREATE TABLE trading_wallets (
  id SERIAL PRIMARY KEY,
  wallet_id TEXT NOT NULL UNIQUE,
  wallet_name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES trading_organizations(organization_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_wallets_org_id_idx ON trading_wallets(organization_id);

-- Trading Wallet Accounts Table
CREATE TABLE trading_wallet_accounts (
  id SERIAL PRIMARY KEY,
  wallet_account_id TEXT NOT NULL UNIQUE,
  wallet_account_name TEXT NOT NULL,
  wallet_id TEXT NOT NULL REFERENCES trading_wallets(wallet_id),
  public_key TEXT NOT NULL,
  stacks_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_accounts_wallet_id_idx ON trading_wallet_accounts(wallet_id);
CREATE INDEX trading_accounts_public_key_idx ON trading_wallet_accounts(public_key);
CREATE INDEX trading_accounts_stacks_address_idx ON trading_wallet_accounts(stacks_address);`, "sql-postgres")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded z-10"
              >
                {copiedId === "sql-postgres" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 text-cyan-400 rounded-lg p-6 text-xs overflow-x-auto">
{`-- Trading Organizations Table
CREATE TABLE trading_organizations (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_orgs_user_id_idx ON trading_organizations(user_id);

-- Trading Wallets Table
CREATE TABLE trading_wallets (
  id SERIAL PRIMARY KEY,
  wallet_id TEXT NOT NULL UNIQUE,
  wallet_name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES trading_organizations(organization_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_wallets_org_id_idx ON trading_wallets(organization_id);

-- Trading Wallet Accounts Table
CREATE TABLE trading_wallet_accounts (
  id SERIAL PRIMARY KEY,
  wallet_account_id TEXT NOT NULL UNIQUE,
  wallet_account_name TEXT NOT NULL,
  wallet_id TEXT NOT NULL REFERENCES trading_wallets(wallet_id),
  public_key TEXT NOT NULL,
  stacks_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_accounts_wallet_id_idx ON trading_wallet_accounts(wallet_id);
CREATE INDEX trading_accounts_public_key_idx ON trading_wallet_accounts(public_key);
CREATE INDEX trading_accounts_stacks_address_idx ON trading_wallet_accounts(stacks_address);`}
              </pre>
            </div>

            {/* SQLite Content */}
            <div id="sql-sqlite-content" className="relative" style={{ display: 'none' }}>
              <button
                onClick={() => handleCopy(`-- Trading Organizations Table
CREATE TABLE trading_organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_orgs_user_id_idx ON trading_organizations(user_id);

-- Trading Wallets Table
CREATE TABLE trading_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id TEXT NOT NULL UNIQUE,
  wallet_name TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES trading_organizations(organization_id)
);

CREATE INDEX trading_wallets_org_id_idx ON trading_wallets(organization_id);

-- Trading Wallet Accounts Table
CREATE TABLE trading_wallet_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_account_id TEXT NOT NULL UNIQUE,
  wallet_account_name TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  stacks_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES trading_wallets(wallet_id)
);

CREATE INDEX trading_accounts_wallet_id_idx ON trading_wallet_accounts(wallet_id);
CREATE INDEX trading_accounts_public_key_idx ON trading_wallet_accounts(public_key);
CREATE INDEX trading_accounts_stacks_address_idx ON trading_wallet_accounts(stacks_address);`, "sql-sqlite")}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded z-10"
              >
                {copiedId === "sql-sqlite" ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-gray-900 text-cyan-400 rounded-lg p-6 text-xs overflow-x-auto">
{`-- Trading Organizations Table
CREATE TABLE trading_organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX trading_orgs_user_id_idx ON trading_organizations(user_id);

-- Trading Wallets Table
CREATE TABLE trading_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id TEXT NOT NULL UNIQUE,
  wallet_name TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES trading_organizations(organization_id)
);

CREATE INDEX trading_wallets_org_id_idx ON trading_wallets(organization_id);

-- Trading Wallet Accounts Table
CREATE TABLE trading_wallet_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_account_id TEXT NOT NULL UNIQUE,
  wallet_account_name TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  stacks_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES trading_wallets(wallet_id)
);

CREATE INDEX trading_accounts_wallet_id_idx ON trading_wallet_accounts(wallet_id);
CREATE INDEX trading_accounts_public_key_idx ON trading_wallet_accounts(public_key);
CREATE INDEX trading_accounts_stacks_address_idx ON trading_wallet_accounts(stacks_address);`}
              </pre>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 p-4 rounded mt-4">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              <strong>💡 Note:</strong> The schema stores organization metadata, wallet info, and account details (including public keys and Stacks addresses) for quick lookups without hitting Turnkey's API.
            </p>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-teal-200 dark:border-teal-700">
          <h3 className="text-xl font-semibold mb-4 text-teal-900 dark:text-teal-100">🏗️ Architecture Flow</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 dark:bg-purple-900/40 px-4 py-2 rounded font-semibold text-purple-900 dark:text-purple-100 min-w-[150px] text-center">
                Cron Job (Every 5-10 min)
              </div>
              <span className="text-2xl text-gray-400">→</span>
              <div className="bg-cyan-100 dark:bg-cyan-900/40 px-4 py-2 rounded font-semibold text-cyan-900 dark:text-cyan-100 min-w-[150px] text-center">
                Fetch from Turnkey
              </div>
              <span className="text-2xl text-gray-400">→</span>
              <div className="bg-teal-100 dark:bg-teal-900/40 px-4 py-2 rounded font-semibold text-teal-900 dark:text-teal-100 min-w-[150px] text-center">
                Cache in Database
              </div>
            </div>
            <div className="text-center text-2xl text-gray-400">↓</div>
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/40 px-4 py-2 rounded font-semibold text-green-900 dark:text-green-100 min-w-[150px] text-center">
                Your App Queries DB
              </div>
              <span className="text-2xl text-gray-400">→</span>
              <div className="bg-yellow-100 dark:bg-yellow-900/40 px-4 py-2 rounded font-semibold text-yellow-900 dark:text-yellow-100 min-w-[150px] text-center">
                Fast Response
              </div>
              <span className="text-2xl text-gray-400">→</span>
              <div className="bg-blue-100 dark:bg-blue-900/40 px-4 py-2 rounded font-semibold text-blue-900 dark:text-blue-100 min-w-[150px] text-center">
                No Rate Limits!
              </div>
            </div>
          </div>
        </div>
      </section>

       {/* Best Practices */}
      <section id="best-practices" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-semibold mb-6">Best Practices</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">🔐 Security</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Use holding wallet for long-term storage</li>
              <li>• Use trading wallet only for active trading</li>
              <li>• Implement rate limiting on API endpoints</li>
              <li>• Set up Turnkey policies to restrict actions</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">⚡ Performance</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Cache organization data</li>
              <li>• Use proper nonce management</li>
              <li>• Implement retry logic with backoff</li>
              <li>• Monitor transaction status async</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-6 rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">🛠️ Error Handling</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Use recovery ID testing for signatures</li>
              <li>• Parse Stacks broadcast errors properly</li>
              <li>• Log all transaction attempts</li>
              <li>• Handle network timeouts gracefully</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-semibold mb-6">Resources</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="https://docs.turnkey.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition"
          >
            <span className="text-2xl">📚</span>
            <div>
              <div className="font-semibold">Turnkey Documentation</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Official Turnkey docs</div>
            </div>
          </a>

          <a
            href="https://docs.stacks.co"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition"
          >
            <span className="text-2xl">📚</span>
            <div>
              <div className="font-semibold">Stacks Documentation</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Official Stacks docs</div>
            </div>
          </a>

          <a
            href="https://github.com/hirosystems/stacks.js"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition"
          >
            <span className="text-2xl">💻</span>
            <div>
              <div className="font-semibold">Stacks.js GitHub</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Source code and examples</div>
            </div>
          </a>

          <a
            href="https://explorer.hiro.so/?chain=testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-semibold">Stacks Explorer</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">View transactions on-chain</div>
            </div>
          </a>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-600 dark:text-gray-400 py-8 border-t border-gray-200 dark:border-gray-700">
        <p>Built with ❤️ using Turnkey × Stacks</p>
        <p className="mt-2">
          <a href="https://github.com/stacksgov/sbtc-cool-stacks-turnkey-demo" className="text-blue-600 hover:underline">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
