"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthState, useTurnkey } from "@turnkey/react-wallet-kit";
import { useTheme } from "next-themes";
import { StacksWallet } from "./components/StacksWallet";
import TradingWalletModule from "./components/TradingWalletModule";
import { Automation } from "./components/Automation";

const tabs = [
  {
    id: "holding",
    label: "Holding Wallet",
    description: "Self-custodied keys, manual control",
  },
  {
    id: "trading",
    label: "Trading Wallet",
    description: "Delegated policies for automated trading",
  },
  {
    id: "automation",
    label: "Automation",
    description: "Multi-step automated swap strategies",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

const statusTone: Record<string, string> = {
  Ready: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/40",
  "Needs Setup": "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/40",
  "Action Required": "bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/40",
};

// Wrapper component to fetch trading accounts for automation
function AutomationWrapper() {
  const { authState, session, user } = useTurnkey();
  const [flattenedAccounts, setFlattenedAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = authState === AuthState.Authenticated;

  useEffect(() => {
    const fetchTradingAccounts = async () => {
      if (!isAuthenticated) {
        setFlattenedAccounts([]);
        setIsLoading(false);
        return;
      }

      const currentUserId = session?.userId ?? user?.userId;
      if (!currentUserId) {
        setError("Missing user ID for the current session");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/db/trading-wallets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: currentUserId }),
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to fetch trading wallets");
        }

        const accounts: any[] = [];
        const wallets = Array.isArray(data.tradingWallets) ? data.tradingWallets : [];

        wallets.forEach((org: any) => {
          org.walletInfo?.forEach((wallet: any) => {
            wallet.accounts?.forEach((account: any, index: number) => {
              const key =
                account.walletAccountId && account.walletAccountId.length > 0
                  ? account.walletAccountId
                  : `${wallet.walletId}:${index}`;

              if (account.publicKey && account.walletAccountId) {
                let stacksAddress: string | null = null;
                try {
                  const { getAddressFromPublicKey } = require("@stacks/transactions");
                  stacksAddress = getAddressFromPublicKey(account.publicKey, "testnet");
                } catch (err) {
                  console.error("Failed to derive Stacks address", err);
                }

                accounts.push({
                  key,
                  organizationId: org.organizationId,
                  organizationName: org.organizationName,
                  walletId: wallet.walletId,
                  walletName: wallet.walletName,
                  walletAccountId: account.walletAccountId,
                  walletAccountName: account.walletAccountName,
                  publicKey: account.publicKey,
                  stacksAddress,
                });
              }
            });
          });
        });

        setFlattenedAccounts(accounts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch trading accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingAccounts();
  }, [isAuthenticated, session?.userId, user?.userId]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-[var(--text-muted)]">
          Please sign in to access automation.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-brand-600)] border-t-transparent"></div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading trading accounts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/50">
        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (flattenedAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-5xl mb-4">🤖</p>
        <h2 className="text-2xl font-bold mb-2">No Trading Accounts Found</h2>
        <p className="text-[var(--text-muted)] mb-4">
          Create a trading wallet first to set up automation.
        </p>
        <button
          type="button"
          onClick={() => {
            // Switch to trading tab
            const event = new CustomEvent("switchTab", { detail: "trading" });
            window.dispatchEvent(event);
          }}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)]"
        >
          Go to Trading Wallet
        </button>
      </div>
    );
  }

  return <Automation flattenedAccounts={flattenedAccounts} />;
}

export default function Home() {
  const { authState, user, handleLogin, logout } = useTurnkey();
  const { theme, setTheme, systemTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("holding");
  const [mounted, setMounted] = useState(false);

  const isAuthenticated = authState === AuthState.Authenticated;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for custom tab switch events
  useEffect(() => {
    const handleSwitchTab = (event: Event) => {
      const customEvent = event as CustomEvent<TabId>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };

    window.addEventListener("switchTab", handleSwitchTab);
    return () => window.removeEventListener("switchTab", handleSwitchTab);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (!mounted) {
      return "dark";
    }

    if (!theme || theme === "system") {
      return systemTheme ?? "dark";
    }

    return theme;
  }, [mounted, theme, systemTheme]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!theme) {
      setTheme("dark");
    }
  }, [mounted, theme, setTheme]);

  const holdingStatus = useMemo(
    () => (isAuthenticated ? "Ready" : "Needs Setup"),
    [isAuthenticated]
  );

  const tradingStatus = useMemo(() => {
    if (!isAuthenticated) {
      return "Needs Setup";
    }

    return "Action Required";
  }, [isAuthenticated]);

  const toggleTheme = () => {
    if (!mounted) {
      return;
    }
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const appToneClass = resolvedTheme === "dark"
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";

  const heroTopGlowClass = resolvedTheme === "dark"
    ? "bg-gradient-to-br from-sky-500/40 via-purple-500/30 to-transparent"
    : "bg-gradient-to-br from-sky-300/40 via-purple-200/30 to-transparent";

  const heroBottomGlowClass = resolvedTheme === "dark"
    ? "bg-gradient-to-l from-emerald-500/30 via-teal-500/20 to-transparent"
    : "bg-gradient-to-l from-emerald-300/30 via-teal-200/20 to-transparent";

  const heroCardClass = resolvedTheme === "dark"
    ? "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    : "group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl";

  const consoleContainerClass = resolvedTheme === "dark"
    ? "overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(56,189,248,0.15)] backdrop-blur"
    : "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl";

  const headingClass = resolvedTheme === "dark" ? "text-white" : "text-slate-900";
  const subheadingClass = resolvedTheme === "dark" ? "text-slate-300" : "text-slate-600";
  const detailHeadingClass = resolvedTheme === "dark" ? "text-white/50" : "text-slate-500";
  const heroPillClass = resolvedTheme === "dark"
    ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white/60 backdrop-blur"
    : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-widest text-slate-500 shadow-sm";
  const tabWrapperClass = resolvedTheme === "dark"
    ? "flex rounded-full bg-white/10 p-1 text-sm font-medium text-white/70 backdrop-blur"
    : "flex rounded-full border border-slate-200 bg-slate-100 p-1 text-sm font-medium text-slate-600";
  const activeTabClass = resolvedTheme === "dark"
    ? "bg-gradient-to-r from-sky-500 via-emerald-500 to-purple-500 text-white shadow"
    : "bg-slate-900 text-slate-50 shadow";
  const inactiveTabClass = resolvedTheme === "dark"
    ? "hover:text-white"
    : "text-slate-500 hover:text-slate-900";
  const focusOutlineClass = resolvedTheme === "dark"
    ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";
  const consoleBodyClass = resolvedTheme === "dark"
    ? "mt-2 border-t border-white/10 bg-slate-950/60 px-6 pb-8 pt-6 backdrop-blur lg:px-8"
    : "mt-2 border-t border-slate-200 bg-slate-50 px-6 pb-8 pt-6 lg:px-8";
  const footerTextClass = resolvedTheme === "dark" ? "text-slate-500/80" : "text-slate-500";

  return (
    <div className={`relative isolate min-h-screen overflow-hidden transition-colors duration-300 ${appToneClass}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl ${heroTopGlowClass}`} />
        <div className={`absolute bottom-0 right-[-10%] h-[320px] w-[420px] rounded-full blur-3xl ${heroBottomGlowClass}`} />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-16 sm:pt-20 lg:px-10">
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow transition ${
              resolvedTheme === "dark"
                ? "border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="text-base" aria-hidden="true">
              {resolvedTheme === "dark" ? "☀️" : "🌙"}
            </span>
            <span className={resolvedTheme === "dark" ? "text-white" : "text-slate-600"}>
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <div
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium transition sm:w-auto ${
              resolvedTheme === "dark"
                ? "border-white/10 bg-white/5 text-slate-200"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {isAuthenticated ? (
              <span className="max-w-[200px] truncate">
                {user?.userEmail ?? user?.userName ?? user?.userId ?? "Signed in"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleLogin()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-brand-700)]"
              >
                Connect with Turnkey
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("holding")}
                className="rounded-full border border-transparent px-2 py-1 text-xs text-[var(--color-brand-600)] hover:bg-[var(--color-brand-600)]/10"
              >
                Holding
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trading")}
                className="rounded-full border border-transparent px-2 py-1 text-xs text-[var(--color-brand-600)] hover:bg-[var(--color-brand-600)]/10"
              >
                Trading
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("automation")}
                className="rounded-full border border-transparent px-2 py-1 text-xs text-[var(--color-brand-600)] hover:bg-[var(--color-brand-600)]/10"
              >
                Automation
              </button>
              <button
                type="button"
                onClick={() => window.open("/docs", "_blank")}
                className="rounded-full border border-transparent px-2 py-1 text-xs text-[var(--color-brand-600)] hover:bg-[var(--color-brand-600)]/10"
              >
                Docs
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-full border border-transparent px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        <header className="flex flex-col gap-8 text-center sm:gap-10">
          <div className="space-y-4 sm:space-y-5">
            <p className={heroPillClass}>
              sBTC.Cool - Stacks x Turnkey Demo
            </p>
            <h1 className={`text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${headingClass}`}>
              Hold securely, automate confidently.
            </h1>
            <p className={`mx-auto max-w-2xl text-base sm:text-lg ${subheadingClass}`}>
              A unified crypto dashboard combining self-custodied wallets with policy-guarded automation. Create passkey-secured accounts, export seeds, transfer STX/sBTC, then provision delegated trading wallets that execute scheduled DCA swaps and auto-return proceeds to your holding wallet—all from one interface.
            </p>
          </div>

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <article className={heroCardClass}>
              <div className="absolute -right-20 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl transition group-hover:scale-125" />
              <div className="relative flex items-start justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${headingClass}`}>Holding Wallet</h2>
                  <p className={`mt-1 max-w-xs text-sm ${subheadingClass}`}>
                    Keys never leave your device. Export seed phrases, sign transactions, and set approved destinations for automations.
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusTone[holdingStatus]}`}
                >
                  {holdingStatus}
                </span>
              </div>
              <dl className={`relative mt-6 grid gap-3 text-xs ${subheadingClass}`}>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Control level</dt>
                  <dd className={`font-medium ${headingClass}`}>100% user-controlled</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Security</dt>
                  <dd className={`font-medium ${headingClass}`}>Seed export · Manual signing</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Automation access</dt>
                  <dd className={`font-medium ${headingClass}`}>No, users need to sign each transaction</dd>
                </div>
              </dl>
            </article>

            <article className={heroCardClass}>
              <div className="absolute -left-16 bottom-[-20%] h-44 w-44 rounded-full bg-sky-500/25 blur-3xl transition group-hover:scale-125" />
              <div className="relative flex items-start justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${headingClass}`}>Trading Wallet</h2>
                  <p className={`mt-1 max-w-xs text-sm ${subheadingClass}`}>
                    Provisioned with delegated policies so our automation can run DCA or rebalancing strategies while respecting guardrails.
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusTone[tradingStatus]}`}
                >
                  {tradingStatus}
                </span>
              </div>
              <dl className={`relative mt-6 grid gap-3 text-xs ${subheadingClass}`}>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Control level</dt>
                  <dd className={`font-medium ${headingClass}`}>Delegated automation</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Security</dt>
                  <dd className={`font-medium ${headingClass}`}>Policy-scoped access</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className={`uppercase tracking-wide ${detailHeadingClass}`}>Automation access</dt>
                  <dd className={`font-medium ${headingClass}`}>YES. Usecase: Auto DCA, Rebalance, Trading Bot</dd>
                </div>
              </dl>
            </article>
          </div>
        </header>

        <section className={consoleContainerClass}>
          <div className="flex flex-col gap-4 px-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${headingClass}`}>Wallet Console</h2>
              <p className={`text-sm ${subheadingClass}`}>
                Switch between your self-custodied accounts and automation controls without leaving this dashboard.
              </p>
            </div>
            <div className={`w-full ${tabWrapperClass}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded-full px-4 py-2 transition ${focusOutlineClass} ${
                    activeTab === tab.id ? activeTabClass : inactiveTabClass
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={consoleBodyClass}>
            {activeTab === "holding" && <StacksWallet variant="embedded" />}
            {activeTab === "trading" && <TradingWalletModule variant="embedded" />}
            {activeTab === "automation" && <AutomationWrapper />}
          </div>
        </section>

        <footer className={`pb-10 text-center text-xs ${footerTextClass}`}>
          <p className="mb-3">
            <a
              href="https://platform.hiro.so/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition"
            >
              Get sBTC/STX Test →
            </a>
          </p>
          <p>
            Built with Turnkey & Stacks | Crafted by <a href="https://stx.city/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-brand-600)] transition-colors">@stxcity</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
