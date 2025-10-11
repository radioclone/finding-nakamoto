"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { AuthState, useTurnkey } from "@turnkey/react-wallet-kit";
import { getAddressFromPublicKey } from "@stacks/transactions";
import { Automation } from "./Automation";

type ProvisionStatus = "idle" | "pending" | "success" | "error";

type ProvisionResult = {
  subOrganizationId: string;
  delegatedUserId?: string;
  endUserId?: string;
  policyId?: string;
  walletId: string;
  addresses: string[];
};

type TradingOrg = {
  organizationId: string;
  organizationName: string;
  wallets: Array<{
    walletId: string;
    walletName: string;
    accounts: Array<{
      walletAccountId: string;
      walletAccountName: string;
      publicKey: string;
      stacksAddress: string | null;
    }>;
  }>;
};

type TestTransferState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  txId?: string;
};

type TransferPopupState = {
  isOpen: boolean;
  organizationId: string;
  walletId: string;
  account: TradingOrg["wallets"][number]["accounts"][number] | null;
  statusKey: string;
  recipientAddress: string;
  amountStx: string;
};

type DcaDirection = "stx_to_sbtc" | "sbtc_to_stx";
type DcaCadence = "daily" | "weekly" | "custom" | "test";
type BroadcastMode = "auto" | "manual_review";
type DcaScheduleStatus = "active" | "paused" | "completed" | "error";

type FlattenedTradingAccount = {
  key: string;
  organizationId: string;
  organizationName: string;
  walletId: string;
  walletName: string;
  walletAccountId: string;
  walletAccountName: string;
  publicKey: string;
  stacksAddress: string | null;
};

type DcaSchedule = {
  id: string;
  direction: DcaDirection;
  tradingAccount: FlattenedTradingAccount;
  amountDisplay: string;
  amountBaseUnit: string;
  amountUnit: "micro_stx" | "satoshi";
  cadence: DcaCadence;
  customCron?: string;
  startAtIso: string;
  timeZone: string;
  maxSlippageBps: number;
  maxRuns?: number;
  totalRuns: number;
  broadcastMode: BroadcastMode;
  destinationAddress?: string;
  status: DcaScheduleStatus;
  createdAtIso: string;
  nextRunAtIso?: string;
  testIntervalSeconds?: number;
  testExpirySeconds?: number;
};

type DcaFormState = {
  direction: DcaDirection;
  walletAccountKey: string;
  amount: string;
  cadence: DcaCadence;
  customCron: string;
  startDate: string;
  startTime: string;
  timeZone: string;
  maxSlippageBps: string;
  broadcastMode: BroadcastMode;
  sendToHolding: boolean;
  destinationAddress: string;
  maxRuns: string;
  testIntervalSeconds: string;
  testExpirySeconds: string;
};

type PreviewState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  payload?: unknown;
};

const toBaseUnits = (value: string, decimals: number): string => {
  const sanitized = value.trim();

  if (!sanitized) {
    throw new Error("Amount is required");
  }

  if (!/^\d*(?:\.\d*)?$/.test(sanitized)) {
    throw new Error("Amount must be a positive number");
  }

  const [whole = "0", fraction = ""] = sanitized.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const combined = `${normalizedWhole}${normalizedFraction}`.replace(/^0+(?=\d)/, "") || "0";

  return BigInt(combined).toString();
};

const computeNextRunIso = (
  schedule: DcaSchedule,
  referenceDate: Date = new Date()
): string | undefined => {
  switch (schedule.cadence) {
    case "daily":
      return new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "weekly":
      return new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "test":
      if (schedule.testIntervalSeconds) {
        return new Date(referenceDate.getTime() + schedule.testIntervalSeconds * 1000).toISOString();
      }
      return undefined;
    default:
      return undefined;
  }
};

const formatIsoForDisplay = (iso?: string) => {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const sanitizeUserId = (value: string) =>
  value.replace(/@/g, "_").replace(/\./g, "_");

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected error while provisioning trading wallet";
};

type TradingWalletModuleProps = {
  variant?: "embedded" | "standalone";
};

export function TradingWalletModule({ variant = "embedded" }: TradingWalletModuleProps) {
  const { authState, session, user, handleLogin, logout } = useTurnkey();
  const { theme, systemTheme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? (theme === "system" ? systemTheme : theme) ?? "dark";
  const isDarkMode = effectiveTheme === "dark";
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<ProvisionStatus>("idle");
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tradingOrgs, setTradingOrgs] = useState<TradingOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [tradingOrgsError, setTradingOrgsError] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestTransferState>>({});
  const [swapStatuses, setSwapStatuses] = useState<Record<string, TestTransferState>>({});
  const [swapSbtcStatuses, setSwapSbtcStatuses] = useState<Record<string, TestTransferState>>({});
  const [transferPopup, setTransferPopup] = useState<TransferPopupState>({
    isOpen: false,
    organizationId: "",
    walletId: "",
    account: null,
    statusKey: "",
    recipientAddress: process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS || "",
    amountStx: "1",
  });
  const [balances, setBalances] = useState<Record<string, { stx_amount: number; sbtc_amount: number; formatted_stx: string; formatted_balance: string } | null>>({});
  const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});
  const [dcaSchedules, setDcaSchedules] = useState<DcaSchedule[]>([]);
  const [scheduleRunStatuses, setScheduleRunStatuses] = useState<Record<string, TestTransferState>>({});
  const [schedulePreview, setSchedulePreview] = useState<PreviewState>({ status: "idle" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [isRefreshingDestinations, setIsRefreshingDestinations] = useState(false);
  const [dcaForm, setDcaForm] = useState<DcaFormState>(() => {
    const now = new Date();
    const defaultDate = now.toISOString().slice(0, 10);
    const defaultTime = "09:00";
    const defaultZone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";

    return {
      direction: "stx_to_sbtc",
      walletAccountKey: "",
      amount: "",
      cadence: "weekly",
      customCron: "",
      startDate: defaultDate,
      startTime: defaultTime,
      timeZone: defaultZone,
      maxSlippageBps: "50",
      broadcastMode: "auto",
      sendToHolding: true,
      destinationAddress: "",
      maxRuns: "",
      testIntervalSeconds: "30",
      testExpirySeconds: "300",
    };
  });

  const isAuthenticated = authState === AuthState.Authenticated;
  const isBusy = status === "pending";

  const isStandalone = variant === "standalone";
  const containerClasses = isStandalone
    ? "font-sans min-h-screen p-8 pb-20 sm:p-20"
    : "w-full";
  const mainClasses = isStandalone
    ? "flex flex-col gap-8 max-w-3xl mx-auto"
    : "flex flex-col gap-6";
  const shellClasses = isStandalone
    ? isDarkMode
      ? "rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl space-y-6"
      : "rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6"
    : isDarkMode
      ? "rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur space-y-6"
      : "rounded-3xl border border-slate-200 bg-white p-6 shadow-lg space-y-6";
  const headerTitleClass = isDarkMode ? "text-4xl font-bold text-white" : "text-4xl font-bold text-slate-900";
  const headerSubtitleClass = isDarkMode ? "text-base text-slate-300" : "text-base text-slate-600";
  const mutedTextClass = isDarkMode ? "text-[var(--text-muted)]" : "text-slate-500";
  const secondaryTextClass = isDarkMode ? "text-[var(--text-secondary)]" : "text-slate-700";
  const infoTextClass = isDarkMode ? "text-sm text-[var(--text-secondary)]" : "text-sm text-slate-600";
  const sectionCardClass = isDarkMode
    ? "space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4"
    : "space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm";
  const listCardClass = isDarkMode
    ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
    : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const innerCardClass = isDarkMode
    ? "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-3"
    : "rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3";
  const flattenedAccounts = useMemo<FlattenedTradingAccount[]>(() => {
    const accounts: FlattenedTradingAccount[] = [];

    tradingOrgs.forEach((org) => {
      org.wallets.forEach((wallet) => {
        wallet.accounts.forEach((account, index) => {
          const key =
            account.walletAccountId && account.walletAccountId.length > 0
              ? account.walletAccountId
              : `${wallet.walletId}:${index}`;

          accounts.push({
            key,
            organizationId: org.organizationId,
            organizationName: org.organizationName,
            walletId: wallet.walletId,
            walletName: wallet.walletName,
            walletAccountId: account.walletAccountId,
            walletAccountName: account.walletAccountName,
            publicKey: account.publicKey,
            stacksAddress: account.stacksAddress,
          });
        });
      });
    });

    return accounts.filter((account) => !!account.publicKey && !!account.walletAccountId);
  }, [tradingOrgs]);

  const selectedAccount = useMemo(
    () =>
      flattenedAccounts.find(
        (account) => account.key === dcaForm.walletAccountKey
      ) || null,
    [flattenedAccounts, dcaForm.walletAccountKey]
  );

  const automationStats = useMemo(() => {
    const active = dcaSchedules.filter((schedule) => schedule.status === "active");
    const paused = dcaSchedules.filter((schedule) => schedule.status === "paused");
    const test = dcaSchedules.filter((schedule) => schedule.cadence === "test");

    return {
      total: dcaSchedules.length,
      active: active.length,
      paused: paused.length,
      test: test.length,
    };
  }, [dcaSchedules]);

  const statusBadgeStyles: Record<DcaScheduleStatus, string> = {
    active: "bg-emerald-500/10 text-emerald-500",
    paused: "bg-slate-500/10 text-slate-400",
    completed: "bg-purple-500/10 text-purple-400",
    error: "bg-red-500/10 text-red-400",
  };

  const directionLabels: Record<DcaDirection, string> = {
    stx_to_sbtc: "STX → sBTC",
    sbtc_to_stx: "sBTC → STX",
  };

  const formatCadence = (schedule: DcaSchedule) => {
    switch (schedule.cadence) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "custom":
        return schedule.customCron ? `Cron: ${schedule.customCron}` : "Custom";
      case "test":
        return schedule.testIntervalSeconds
          ? `Test • every ${schedule.testIntervalSeconds}s`
          : "Test cadence";
      default:
        return "—";
    }
  };

  const updateFormField = <K extends keyof DcaFormState>(
    field: K,
    value: DcaFormState[K]
  ) => {
    setDcaForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormError(null);
    setFormSuccess(null);
    setSchedulePreview({ status: "idle" });
  };

  const sendToHolding = dcaForm.sendToHolding;
  const currentDestination = dcaForm.destinationAddress;

  const resetState = () => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  };

  const refreshDestinationOptions = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsRefreshingDestinations(true);

    try {
      const stored = window.localStorage.getItem("sbtc_dca_destinations");

      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, { enabled: boolean; address: string }>;
        const enabled = Object.values(parsed)
          .filter((destination) => destination?.enabled && destination.address)
          .map((destination) => destination.address);

        setDestinationOptions(enabled);
      } else {
        setDestinationOptions([]);
      }
    } catch (storageError) {
      console.error("Failed to load holding destinations", storageError);
      setDestinationOptions([]);
    } finally {
      setIsRefreshingDestinations(false);
    }
  }, []);

  const fetchTradingOrgs = useCallback(async () => {
    if (!isAuthenticated) {
      setTradingOrgs([]);
      setTradingOrgsError(null);
      return;
    }

    const currentUserId = session?.userId ?? user?.userId;

    if (!currentUserId) {
      setTradingOrgs([]);
      setTradingOrgsError("Missing user ID for the current session");
      return;
    }

    setLoadingOrgs(true);
    setTradingOrgsError(null);

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

      const orgs: TradingOrg[] = Array.isArray(data.tradingWallets)
        ? data.tradingWallets
            .filter((org: unknown): org is Record<string, unknown> =>
              typeof org === "object" && org !== null
            )
            .map((org: Record<string, unknown>) => ({
              organizationId: String(org.organizationId ?? ""),
              organizationName: String(org.organizationName ?? ""),
              wallets: Array.isArray(org.walletInfo)
                ? org.walletInfo
                    .filter((wallet: unknown): wallet is Record<string, unknown> =>
                      typeof wallet === "object" && wallet !== null
                    )
                    .map((wallet: Record<string, unknown>) => {
                      const accounts = Array.isArray(wallet.accounts)
                        ? wallet.accounts
                            .filter(
                              (account: unknown): account is Record<string, unknown> =>
                                typeof account === "object" && account !== null
                            )
                            .map((account: Record<string, unknown>) => {
                              const publicKey =
                                typeof account.publicKey === "string"
                                  ? account.publicKey
                                  : "";
                              let stacksAddress: string | null = null;

                              if (publicKey) {
                                try {
                                  stacksAddress = getAddressFromPublicKey(
                                    publicKey,
                                    "testnet"
                                  );
                                } catch (deriveError) {
                                  console.error(
                                    "Failed to derive Stacks address for account",
                                    deriveError
                                  );
                                }
                              }

                              return {
                                walletAccountId: String(
                                  account.walletAccountId ?? ""
                                ),
                                walletAccountName: String(
                                  account.walletAccountName ?? ""
                                ),
                                publicKey,
                                stacksAddress,
                              };
                            })
                        : [];

                      return {
                        walletId: String(wallet.walletId ?? ""),
                        walletName: String(wallet.walletName ?? ""),
                        accounts,
                      };
                    })
                : [],
            }))
        : [];

      setTradingOrgs(orgs);
    } catch (error) {
      setTradingOrgs([]);
      setTradingOrgsError(formatError(error));
    } finally {
      setLoadingOrgs(false);
    }
  }, [isAuthenticated, session?.userId, user?.userId]);

  useEffect(() => {
    refreshDestinationOptions();
  }, [refreshDestinationOptions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem("sbtc_dca_schedules");
      if (stored) {
        const parsed = JSON.parse(stored) as DcaSchedule[];
        if (Array.isArray(parsed)) {
          setDcaSchedules(parsed);
        }
      }
    } catch (storageError) {
      console.error("Failed to restore DCA schedules", storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem("sbtc_dca_schedules", JSON.stringify(dcaSchedules));
    } catch (storageError) {
      console.error("Failed to persist DCA schedules", storageError);
    }
  }, [dcaSchedules]);

  useEffect(() => {
    if (flattenedAccounts.length === 0) {
      return;
    }

    setDcaForm((prev) => {
      if (prev.walletAccountKey && flattenedAccounts.some((account) => account.key === prev.walletAccountKey)) {
        return prev;
      }

      return {
        ...prev,
        walletAccountKey: flattenedAccounts[0].key,
      };
    });
  }, [flattenedAccounts]);

  useEffect(() => {
    if (!sendToHolding) {
      return;
    }

    if (destinationOptions.length === 0) {
      setDcaForm((prev) => ({
        ...prev,
        destinationAddress: "",
      }));
      return;
    }

    if (currentDestination && destinationOptions.includes(currentDestination)) {
      return;
    }

    setDcaForm((prev) => ({
      ...prev,
      destinationAddress: destinationOptions[0],
    }));
  }, [destinationOptions, sendToHolding, currentDestination]);

  const fetchBalance = async (address: string) => {
    try {
      setLoadingBalances(prev => ({ ...prev, [address]: true }));

      const response = await fetch(`/api/sbtc/balance/${address}`);

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();

      setBalances(prev => ({
        ...prev,
        [address]: {
          stx_amount: data.stx_amount,
          sbtc_amount: data.sbtc_amount,
          formatted_stx: data.formatted_stx,
          formatted_balance: data.formatted_balance
        }
      }));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalances(prev => ({ ...prev, [address]: null }));
    } finally {
      setLoadingBalances(prev => ({ ...prev, [address]: false }));
    }
  };

  const handleTestSwap = async (
    organizationId: string,
    walletId: string,
    account: TradingOrg["wallets"][number]["accounts"][number],
    statusKey: string
  ) => {
    if (!account.publicKey || !account.walletAccountId) {
      setSwapStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: "Account missing identifiers for signing",
        },
      }));
      return;
    }

    setSwapStatuses((prev) => ({
      ...prev,
      [statusKey]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/stacks/swap-stx-to-sbtc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          walletId,
          walletAccountId: account.walletAccountId,
          publicKey: account.publicKey,
          stxAmount: 1_000_000, // 1 STX
          network: "testnet",
          broadcast: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to execute swap");
      }

      // Check if broadcastResult contains an error
      if (payload.broadcastResult && typeof payload.broadcastResult === 'object' && 'error' in payload.broadcastResult) {
        const result = payload.broadcastResult as any;
        let errorMessage = `Transaction ${result.error}`;

        if ('reason' in result && result.reason) {
          errorMessage += `: ${result.reason}`;

          if ('reason_data' in result && result.reason_data) {
            const data = result.reason_data as any;
            if (data.actual !== undefined && data.expected !== undefined) {
              const actualAmount = parseInt(data.actual, 16);
              const expectedAmount = parseInt(data.expected, 16);
              errorMessage += ` (have ${actualAmount} µSTX, need ${expectedAmount} µSTX)`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      const txId = payload.broadcastResult?.txid;
      setSwapStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "success",
          message: txId
            ? `Swap succeeded (txid: ${txId})`
            : "Transaction signed",
          txId: txId ?? undefined,
        },
      }));

      // Refresh balance after successful swap
      if (account.stacksAddress) {
        setTimeout(() => fetchBalance(account.stacksAddress!), 2000);
      }
    } catch (error) {
      setSwapStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: formatError(error),
        },
      }));
    }
  };

  const handleTestSwapSbtc = async (
    organizationId: string,
    walletId: string,
    account: TradingOrg["wallets"][number]["accounts"][number],
    statusKey: string
  ) => {
    if (!account.publicKey || !account.walletAccountId) {
      setSwapSbtcStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: "Account missing identifiers for signing",
        },
      }));
      return;
    }

    setSwapSbtcStatuses((prev) => ({
      ...prev,
      [statusKey]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/stacks/swap-sbtc-to-stx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          walletId,
          walletAccountId: account.walletAccountId,
          publicKey: account.publicKey,
          sbtcAmount: 500, // 500 satoshis
          network: "testnet",
          broadcast: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to execute sBTC swap");
      }

      // Check if broadcastResult contains an error
      if (payload.broadcastResult && typeof payload.broadcastResult === 'object' && 'error' in payload.broadcastResult) {
        const result = payload.broadcastResult as any;
        let errorMessage = `Transaction ${result.error}`;

        if ('reason' in result && result.reason) {
          errorMessage += `: ${result.reason}`;

          if ('reason_data' in result && result.reason_data) {
            const data = result.reason_data as any;
            if (data.actual !== undefined && data.expected !== undefined) {
              const actualAmount = parseInt(data.actual, 16);
              const expectedAmount = parseInt(data.expected, 16);
              errorMessage += ` (have ${actualAmount} µSTX, need ${expectedAmount} µSTX)`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      const txId = payload.broadcastResult?.txid;
      setSwapSbtcStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "success",
          message: txId
            ? `sBTC swap succeeded (txid: ${txId})`
            : "Transaction signed",
          txId: txId ?? undefined,
        },
      }));

      // Refresh balance after successful swap
      if (account.stacksAddress) {
        setTimeout(() => fetchBalance(account.stacksAddress!), 2000);
      }
    } catch (error) {
      setSwapSbtcStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: formatError(error),
        },
      }));
    }
  };

  const handleTestTransfer = async () => {
    const { organizationId, walletId, account, statusKey, recipientAddress, amountStx } = transferPopup;

    if (!account?.publicKey || !account?.walletAccountId) {
      setTestStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: "Account missing identifiers for signing",
        },
      }));
      setTransferPopup((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    if (!recipientAddress || !amountStx) {
      setTestStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: "Recipient address and amount are required",
        },
      }));
      return;
    }

    setTestStatuses((prev) => ({
      ...prev,
      [statusKey]: { status: "loading" },
    }));

    // Close the popup
    setTransferPopup((prev) => ({ ...prev, isOpen: false }));

    try {
      // Convert STX to micro-STX (1 STX = 1,000,000 micro-STX)
      const amountMicroStx = (parseFloat(amountStx) * 1_000_000).toString();

      const response = await fetch("/api/stacks/send-stx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          walletId,
          walletAccountId: account.walletAccountId,
          publicKey: account.publicKey,
          recipientAddress,
          amountMicroStx,
          network: "testnet",
          broadcast: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to send STX");
      }

      // Check if broadcastResult contains an error
      if (payload.broadcastResult && typeof payload.broadcastResult === 'object' && 'error' in payload.broadcastResult) {
        const result = payload.broadcastResult as any;
        let errorMessage = `Transaction ${result.error}`;

        if ('reason' in result && result.reason) {
          errorMessage += `: ${result.reason}`;

          if ('reason_data' in result && result.reason_data) {
            const data = result.reason_data as any;
            if (data.actual !== undefined && data.expected !== undefined) {
              const actualAmount = parseInt(data.actual, 16);
              const expectedAmount = parseInt(data.expected, 16);
              errorMessage += ` (have ${actualAmount} µSTX, need ${expectedAmount} µSTX)`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      const txId = payload.broadcastResult?.txid;
      setTestStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "success",
          message: txId
            ? `Transfer succeeded (txid: ${txId})`
            : "Transaction signed",
          txId: txId ?? undefined,
        },
      }));

      // Refresh balance after successful transfer
      if (account.stacksAddress) {
        setTimeout(() => fetchBalance(account.stacksAddress!), 2000);
      }
    } catch (error) {
      setTestStatuses((prev) => ({
        ...prev,
        [statusKey]: {
          status: "error",
          message: formatError(error),
        },
      }));
    }
  };

  const executeSwap = useCallback(
    async ({
      direction,
      account,
      amountBaseUnit,
      broadcast,
    }: {
      direction: DcaDirection;
      account: FlattenedTradingAccount;
      amountBaseUnit: string;
      broadcast: boolean;
    }) => {
      const endpoint =
        direction === "stx_to_sbtc"
          ? "/api/stacks/swap-stx-to-sbtc"
          : "/api/stacks/swap-sbtc-to-stx";

      const body: Record<string, unknown> = {
        organizationId: account.organizationId,
        walletId: account.walletId,
        walletAccountId: account.walletAccountId,
        publicKey: account.publicKey,
        network: "testnet",
        broadcast,
      };

      if (direction === "stx_to_sbtc") {
        body.stxAmount = amountBaseUnit;
      } else {
        body.sbtcAmount = amountBaseUnit;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Swap request failed");
      }

      // Check if broadcastResult contains an error
      if (payload.broadcastResult && typeof payload.broadcastResult === 'object' && 'error' in payload.broadcastResult) {
        const result = payload.broadcastResult as any;
        let errorMessage = `Transaction ${result.error}`;

        if ('reason' in result && result.reason) {
          errorMessage += `: ${result.reason}`;

          if ('reason_data' in result && result.reason_data) {
            const data = result.reason_data as any;
            if (data.actual !== undefined && data.expected !== undefined) {
              const actualAmount = parseInt(data.actual, 16);
              const expectedAmount = parseInt(data.expected, 16);
              errorMessage += ` (have ${actualAmount} µSTX, need ${expectedAmount} µSTX)`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      return payload as Record<string, unknown>;
    },
    []
  );

  const handlePreviewSchedule = async () => {
    setSchedulePreview({ status: "loading" });
    setFormError(null);
    setFormSuccess(null);

    if (!selectedAccount) {
      setSchedulePreview({
        status: "error",
        message: "Select a trading wallet account",
      });
      return;
    }

    if (!dcaForm.amount.trim()) {
      setSchedulePreview({
        status: "error",
        message: "Enter an amount to preview",
      });
      return;
    }

    try {
      const amountBaseUnit =
        dcaForm.direction === "stx_to_sbtc"
          ? toBaseUnits(dcaForm.amount, 6)
          : toBaseUnits(dcaForm.amount, 8);

      const payload = await executeSwap({
        direction: dcaForm.direction,
        account: selectedAccount,
        amountBaseUnit,
        broadcast: false,
      });

      setSchedulePreview({
        status: "success",
        message: "Swap simulated successfully. Review the payload below.",
        payload,
      });
    } catch (error) {
      setSchedulePreview({
        status: "error",
        message: error instanceof Error ? error.message : "Preview failed",
      });
    }
  };

  const handleCreateSchedule = () => {
    setFormError(null);
    setFormSuccess(null);

    if (!selectedAccount) {
      setFormError("Select a trading wallet account");
      return;
    }

    if (!dcaForm.amount.trim()) {
      setFormError("Enter an amount to DCA");
      return;
    }

    if (dcaForm.sendToHolding && !dcaForm.destinationAddress) {
      setFormError("Choose a Holding Wallet destination");
      return;
    }

    try {
      setIsSavingSchedule(true);

      const amountBaseUnit =
        dcaForm.direction === "stx_to_sbtc"
          ? toBaseUnits(dcaForm.amount, 6)
          : toBaseUnits(dcaForm.amount, 8);

      const scheduleId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `schedule-${Date.now()}`;

      const startDateTime = new Date(
        `${dcaForm.startDate}T${dcaForm.startTime || "00:00"}`
      );
      const maxSlippage = Number(dcaForm.maxSlippageBps) || 0;
      const maxRuns = dcaForm.maxRuns ? Number(dcaForm.maxRuns) : undefined;
      const testIntervalSeconds =
        dcaForm.cadence === "test"
          ? Number(dcaForm.testIntervalSeconds) || 30
          : undefined;
      const testExpirySeconds =
        dcaForm.cadence === "test"
          ? Number(dcaForm.testExpirySeconds) || 300
          : undefined;

      const newSchedule: DcaSchedule = {
        id: scheduleId,
        direction: dcaForm.direction,
        tradingAccount: selectedAccount,
        amountDisplay: dcaForm.amount,
        amountBaseUnit,
        amountUnit:
          dcaForm.direction === "stx_to_sbtc" ? "micro_stx" : "satoshi",
        cadence: dcaForm.cadence,
        customCron:
          dcaForm.cadence === "custom"
            ? dcaForm.customCron.trim() || undefined
            : undefined,
        startAtIso: startDateTime.toISOString(),
        timeZone: dcaForm.timeZone,
        maxSlippageBps: maxSlippage,
        maxRuns,
        totalRuns: 0,
        broadcastMode: dcaForm.broadcastMode,
        destinationAddress: dcaForm.sendToHolding
          ? dcaForm.destinationAddress || undefined
          : undefined,
        status: "active",
        createdAtIso: new Date().toISOString(),
        nextRunAtIso: startDateTime.toISOString(),
        testIntervalSeconds,
        testExpirySeconds,
      };

      if (startDateTime.getTime() < Date.now()) {
        newSchedule.nextRunAtIso =
          computeNextRunIso(newSchedule) ?? startDateTime.toISOString();
      }

      setDcaSchedules((prev) => [...prev, newSchedule]);
      setScheduleRunStatuses((prev) => ({
        ...prev,
        [newSchedule.id]: { status: "idle" },
      }));
      setFormSuccess("Schedule saved. Use Run now or let automation pick it up.");
      setSchedulePreview({ status: "idle" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleToggleScheduleStatus = (scheduleId: string) => {
    setDcaSchedules((prev) =>
      prev.map((schedule) => {
        if (schedule.id !== scheduleId) {
          return schedule;
        }

        const nextStatus: DcaScheduleStatus =
          schedule.status === "active" ? "paused" : "active";

        return {
          ...schedule,
          status: nextStatus,
        };
      })
    );
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setDcaSchedules((prev) => prev.filter((schedule) => schedule.id !== scheduleId));
    setScheduleRunStatuses((prev) => {
      const next = { ...prev };
      delete next[scheduleId];
      return next;
    });
  };

  const handleRunSchedule = async (scheduleId: string) => {
    const schedule = dcaSchedules.find((entry) => entry.id === scheduleId);

    if (!schedule) {
      return;
    }

    if (!schedule.tradingAccount.publicKey || !schedule.tradingAccount.walletAccountId) {
      setScheduleRunStatuses((prev) => ({
        ...prev,
        [scheduleId]: {
          status: "error",
          message: "Schedule missing account identifiers",
        },
      }));
      return;
    }

    if (
      schedule.cadence === "test" &&
      schedule.testExpirySeconds &&
      Date.now() >
        new Date(schedule.createdAtIso).getTime() +
          schedule.testExpirySeconds * 1000
    ) {
      setScheduleRunStatuses((prev) => ({
        ...prev,
        [scheduleId]: {
          status: "error",
          message: "Test schedule expired",
        },
      }));
      setDcaSchedules((prev) =>
        prev.map((entry) =>
          entry.id === scheduleId
            ? {
                ...entry,
                status: "completed",
              }
            : entry
        )
      );
      return;
    }

    setScheduleRunStatuses((prev) => ({
      ...prev,
      [scheduleId]: { status: "loading" },
    }));

    try {
      const payload = await executeSwap({
        direction: schedule.direction,
        account: schedule.tradingAccount,
        amountBaseUnit: schedule.amountBaseUnit,
        broadcast: schedule.broadcastMode === "auto",
      });

      const broadcastResult =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).broadcastResult
          : undefined;
      const txId =
        typeof broadcastResult === "object" && broadcastResult !== null
          ? (broadcastResult as Record<string, unknown>).txid
          : undefined;

      const successMessage = schedule.broadcastMode === "auto"
        ? schedule.destinationAddress
          ? `Swap broadcasted. Routing proceeds to ${schedule.destinationAddress}.`
          : "Swap broadcasted successfully."
        : "Swap signed. Awaiting manual broadcast.";

      setScheduleRunStatuses((prev) => ({
        ...prev,
        [scheduleId]: {
          status: "success",
          message: successMessage,
          txId: typeof txId === "string" ? txId : undefined,
        },
      }));

      setDcaSchedules((prev) =>
        prev.map((entry) => {
          if (entry.id !== scheduleId) {
            return entry;
          }

          const updatedRuns = entry.totalRuns + 1;
          const updated: DcaSchedule = {
            ...entry,
            totalRuns: updatedRuns,
          };

          const nextRun = computeNextRunIso(updated);
          updated.nextRunAtIso = nextRun ?? updated.nextRunAtIso;

          if (entry.maxRuns && updatedRuns >= entry.maxRuns) {
            updated.status = "completed";
          } else if (
            entry.cadence === "test" &&
            entry.testExpirySeconds &&
            Date.now() >=
              new Date(entry.createdAtIso).getTime() +
                entry.testExpirySeconds * 1000
          ) {
            updated.status = "completed";
          }

          return updated;
        })
      );
    } catch (error) {
      setScheduleRunStatuses((prev) => ({
        ...prev,
        [scheduleId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Execution failed",
        },
      }));
      setDcaSchedules((prev) =>
        prev.map((entry) =>
          entry.id === scheduleId
            ? {
                ...entry,
                status: "error",
              }
            : entry
        )
      );
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTradingOrgs();
    } else {
      setTradingOrgs([]);
      setTradingOrgsError(null);
    }
  }, [isAuthenticated, fetchTradingOrgs]);

  useEffect(() => {
    // Fetch balances for all accounts when trading orgs are loaded
    if (tradingOrgs && tradingOrgs.length > 0 && !loadingOrgs) {
      tradingOrgs.forEach(org => {
        org.wallets?.forEach(wallet => {
          wallet.accounts?.forEach(account => {
            if (account.stacksAddress) {
              // Only fetch if we haven't already fetched or aren't currently fetching
              if (!balances[account.stacksAddress] && !loadingBalances[account.stacksAddress]) {
                fetchBalance(account.stacksAddress);
              }
            }
          });
        });
      });
    }
  }, [tradingOrgs, loadingOrgs]);

  const handleProvisionTradingWallet = async () => {
    if (!isAuthenticated) {
      await handleLogin();
      return;
    }

    const userId = session?.userId ?? user?.userId;
    const organizationId = session?.organizationId;

    if (!userId) {
      setErrorMessage("Missing user ID for the current session");
      setStatus("error");
      return;
    }

    if (!organizationId) {
      setErrorMessage("Missing organization ID for the current session");
      setStatus("error");
      return;
    }

    if (!user) {
      setErrorMessage("User profile not available");
      setStatus("error");
      return;
    }

    setStatus("pending");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/turnkey/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          organizationId,
          user: {
            userId,
            userName: user.userName,
            userTags: user.userTags ?? [],
          },
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to provision trading wallet");
      }

      const addresses: string[] = Array.isArray(payload.addresses)
        ? payload.addresses.filter((value: unknown): value is string =>
            typeof value === "string"
          )
        : [];

      const provisionResult: ProvisionResult = {
        subOrganizationId: String(payload.subOrganizationId ?? ""),
        delegatedUserId: payload.delegatedUserId
          ? String(payload.delegatedUserId)
          : undefined,
        endUserId: payload.endUserId ? String(payload.endUserId) : undefined,
        policyId: payload.policyId ? String(payload.policyId) : undefined,
        walletId: String(payload.walletId ?? ""),
        addresses,
      };

      setResult(provisionResult);
      setStatus("success");

      // Refresh trading orgs list with a delay to allow background sync to complete
      setTimeout(() => {
        fetchTradingOrgs();
      }, 2000);
    } catch (error) {
      setErrorMessage(formatError(error));
      setStatus("error");
    }
  };

  return (
    <div className={containerClasses}>
      <main className={mainClasses}>
        {isStandalone && (
          <header className="space-y-3 text-center">
            <h1 className={headerTitleClass}>Trading Wallet</h1>
            <p className={headerSubtitleClass}>
              Provision a delegated trading wallet secured by Turnkey
            </p>
          </header>
        )}

        <section className={shellClasses}>
          <div className="flex flex-col gap-2">
            <p className={`text-sm font-medium uppercase tracking-wide ${mutedTextClass}`}>
              Session
            </p>
            {isAuthenticated ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className={secondaryTextClass}>
                  Signed in as <strong>{user?.userName ?? "Unknown user"}</strong>
                </span>
                {session?.organizationId && (
                  <span className={mutedTextClass}>
                    Organization ID: {session.organizationId}
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetState}
                  className="self-start text-xs text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                >
                  Reset state
                </button>
              </div>
            ) : (
              <div className={`flex flex-col gap-2 text-sm ${secondaryTextClass}`}>
                <span>You need to sign in with your Turnkey session first.</span>
                <button
                  type="button"
                  onClick={() => handleLogin()}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-white transition hover:bg-[var(--color-brand-700)]"
                >
                  Connect Turnkey Session
                </button>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="space-y-3">
              <p className={infoTextClass}>
                Creating a trading wallet spins up a delegated sub-organization,
                grants a signing policy to the automation user, and seeds a
                Stacks-ready wallet. This wallet can execute automated DCA or
                rebalancing flows without broad custody permissions.
              </p>

              {/* Total Portfolio Section */}
              {!loadingOrgs && tradingOrgs.length > 0 && (() => {
                const portfolioValue = {
                  totalStx: 0,
                  totalSbtc: 0,
                  loadedAccounts: 0,
                  totalAccounts: 0
                };

                tradingOrgs.forEach(org => {
                  org.wallets?.forEach(wallet => {
                    wallet.accounts?.forEach(account => {
                      if (account.stacksAddress) {
                        portfolioValue.totalAccounts++;
                        const balance = balances[account.stacksAddress];
                        if (balance) {
                          portfolioValue.loadedAccounts++;
                          portfolioValue.totalStx += balance.stx_amount;
                          portfolioValue.totalSbtc += balance.sbtc_amount;
                        }
                      }
                    });
                  });
                });

                return portfolioValue.totalAccounts > 0 ? (
                  <div className="bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-blue-500/10 border-2 border-brand-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">💰</span>
                      <h3 className="text-2xl font-bold">Total Trading Portfolio</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🪙</span>
                          <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide">Total STX</p>
                        </div>
                        <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                          {portfolioValue.totalStx.toFixed(6)} STX
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">₿</span>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Total sBTC</p>
                        </div>
                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                          {portfolioValue.totalSbtc.toFixed(8)} sBTC
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className={sectionCardClass}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-sm font-semibold uppercase tracking-wide ${mutedTextClass}`}>
                    Existing trading wallets
                  </h2>
                  <button
                    type="button"
                    onClick={fetchTradingOrgs}
                    disabled={loadingOrgs}
                    className="inline-flex items-center rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>

                {loadingOrgs ? (
                  <p className={`text-sm ${secondaryTextClass}`}>
                    Loading trading wallets…
                  </p>
                ) : tradingOrgsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
                    {tradingOrgsError}
                  </div>
                ) : tradingOrgs.length === 0 ? (
                  <p className={`text-sm ${secondaryTextClass}`}>
                    No trading wallets detected yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-end gap-2 pb-2">
                      <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAdvanced}
                          onChange={(e) => setShowAdvanced(e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                        />
                        <span>Show advanced</span>
                      </label>
                    </div>
                    {tradingOrgs.map((org) => (
                      <div
                        key={org.organizationId}
                        className={listCardClass}
                      >
                        {showAdvanced && (
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-semibold ${secondaryTextClass}`}>
                              {org.organizationName || "Unnamed Trading Org"}
                            </span>
                            <span className={`font-mono text-xs ${mutedTextClass}`}>
                              {org.organizationId}
                            </span>
                          </div>
                        )}

                        {org.wallets.length > 0 ? (
                          <div className={showAdvanced ? "mt-3 space-y-2" : "space-y-2"}>
                            {showAdvanced && (
                              <p className={`text-xs font-medium uppercase tracking-wide ${mutedTextClass}`}>
                                Wallets
                              </p>
                            )}
                            <div className="space-y-2">
                              {org.wallets.map((wallet) => (
                                <div
                                  key={wallet.walletId}
                                  className={innerCardClass}
                                >
                                  {showAdvanced && (
                                    <div>
                                      <p className={`text-sm font-medium ${secondaryTextClass}`}>
                                        {wallet.walletName || "Unnamed Wallet"}
                                      </p>
                                      <p className={`font-mono text-xs ${mutedTextClass}`}>
                                        {wallet.walletId}
                                      </p>
                                    </div>
                                  )}

                                  {wallet.accounts.length > 0 ? (
                                    <div className="space-y-2">
                                      {showAdvanced && (
                                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${mutedTextClass}`}>
                                          Accounts
                                        </p>
                                      )}
                                      <div className="space-y-2">
                                        {wallet.accounts.map((account, accountIndex) => {
                                          const statusKey =
                                            account.walletAccountId ||
                                            account.publicKey ||
                                            `${wallet.walletId}:${accountIndex}`;
                                          const accountStatus =
                                            testStatuses[statusKey];
                                          const swapStatus =
                                            swapStatuses[statusKey];
                                          const swapSbtcStatus =
                                            swapSbtcStatuses[statusKey];
                                          const balance = account.stacksAddress ? balances[account.stacksAddress] : null;
                                          const isLoadingBalance = account.stacksAddress ? loadingBalances[account.stacksAddress] : false;

                                          return (
                                          <div
                                            key={
                                              account.walletAccountId ||
                                              account.publicKey ||
                                              `${wallet.walletId}:${accountIndex}`
                                            }
                                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 space-y-2"
                                          >
                                            {showAdvanced && account.walletAccountId && (
                                              <div className="flex flex-col gap-1">
                                                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                                  Account ID
                                                </p>
                                                <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                                                  {account.walletAccountId}
                                                </span>
                                              </div>
                                            )}

                                            {showAdvanced && account.publicKey && (
                                              <div className="space-y-1">
                                                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                                  Public Key
                                                </p>
                                                <p className="font-mono text-[11px] break-all text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2 py-1 rounded">
                                                  {account.publicKey}
                                                </p>
                                              </div>
                                            )}

                                            {account.stacksAddress && (
                                              <div className="space-y-1">
                                                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                                  Stacks Address (testnet)
                                                </p>
                                                <p className="font-mono text-[11px] break-all text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2 py-1 rounded">
                                                  {account.stacksAddress}
                                                </p>
                                              </div>
                                            )}

                                            {/* Balance Display */}
                                            {account.stacksAddress && (
                                              <div className="space-y-1">
                                                {isLoadingBalance ? (
                                                  <div className="flex gap-2 animate-pulse">
                                                    <div className="h-12 bg-[var(--bg-subtle)] rounded w-full"></div>
                                                  </div>
                                                ) : balance ? (
                                                  <div className="flex flex-wrap gap-2">
                                                    <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg px-2 py-1.5 flex-1 min-w-[120px]">
                                                      <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide mb-0.5">STX</p>
                                                      <p className="text-xs font-bold text-orange-700 dark:text-orange-300">{balance.formatted_stx}</p>
                                                    </div>
                                                    <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg px-2 py-1.5 flex-1 min-w-[120px]">
                                                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide mb-0.5">sBTC</p>
                                                      <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{balance.formatted_balance}</p>
                                                    </div>
                                                  </div>
                                                ) : null}
                                              </div>
                                            )}

                                            <div className="flex flex-col gap-2 pt-1">
                                              <div className="flex flex-wrap gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setTransferPopup({
                                                      isOpen: true,
                                                      organizationId: org.organizationId,
                                                      walletId: wallet.walletId,
                                                      account,
                                                      statusKey,
                                                      recipientAddress: process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS || "",
                                                      amountStx: "1",
                                                    })
                                                  }
                                                  disabled={
                                                    !account.publicKey ||
                                                    !account.walletAccountId ||
                                                    accountStatus?.status === "loading"
                                                  }
                                                  className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--color-brand-600)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-600)] transition hover:bg-[var(--color-brand-50)] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  {accountStatus?.status === "loading"
                                                    ? "Sending…"
                                                    : "Send STX"}
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleTestSwap(
                                                      org.organizationId,
                                                      wallet.walletId,
                                                      account,
                                                      statusKey
                                                    )
                                                  }
                                                  disabled={
                                                    !account.publicKey ||
                                                    !account.walletAccountId ||
                                                    swapStatus?.status === "loading"
                                                  }
                                                  className="inline-flex w-fit items-center gap-2 rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  {swapStatus?.status === "loading"
                                                    ? "Swapping…"
                                                    : "Swap STX→sBTC"}
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleTestSwapSbtc(
                                                      org.organizationId,
                                                      wallet.walletId,
                                                      account,
                                                      statusKey
                                                    )
                                                  }
                                                  disabled={
                                                    !account.publicKey ||
                                                    !account.walletAccountId ||
                                                    swapSbtcStatus?.status === "loading"
                                                  }
                                                  className="inline-flex w-fit items-center gap-2 rounded-md border border-purple-600 px-3 py-1.5 text-xs font-medium text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  {swapSbtcStatus?.status === "loading"
                                                    ? "Swapping…"
                                                    : "Swap sBTC→STX"}
                                                </button>
                                              </div>

                                              {accountStatus?.status === "error" && (
                                                <p className="text-xs text-red-500">
                                                  {accountStatus.message}
                                                </p>
                                              )}
                                              {accountStatus?.status === "success" && (
                                                <div className="text-xs text-[var(--color-brand-600)]">
                                                  {accountStatus.message}
                                                  {accountStatus.txId && (
                                                    <>
                                                      {" • "}
                                                      <a
                                                        href={`https://explorer.hiro.so/txid/${accountStatus.txId}?chain=testnet`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline hover:text-[var(--color-brand-700)]"
                                                      >
                                                        View on Explorer
                                                      </a>
                                                    </>
                                                  )}
                                                </div>
                                              )}

                                              {swapStatus?.status === "error" && (
                                                <p className="text-xs text-red-500">
                                                  Swap: {swapStatus.message}
                                                </p>
                                              )}
                                              {swapStatus?.status === "success" && (
                                                <div className="text-xs text-blue-600">
                                                  {swapStatus.message}
                                                  {swapStatus.txId && (
                                                    <>
                                                      {" • "}
                                                      <a
                                                        href={`https://explorer.hiro.so/txid/${swapStatus.txId}?chain=testnet`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline hover:text-blue-700"
                                                      >
                                                        View on Explorer
                                                      </a>
                                                    </>
                                                  )}
                                                </div>
                                              )}

                                              {swapSbtcStatus?.status === "error" && (
                                                <p className="text-xs text-red-500">
                                                  sBTC Swap: {swapSbtcStatus.message}
                                                </p>
                                              )}
                                              {swapSbtcStatus?.status === "success" && (
                                                <div className="text-xs text-purple-600">
                                                  {swapSbtcStatus.message}
                                                  {swapSbtcStatus.txId && (
                                                    <>
                                                      {" • "}
                                                      <a
                                                        href={`https://explorer.hiro.so/txid/${swapSbtcStatus.txId}?chain=testnet`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline hover:text-purple-700"
                                                      >
                                                        View on Explorer
                                                      </a>
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[var(--text-muted)]">
                                      No accounts found for this wallet yet.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-muted)]">
                            No wallets found for this trading organization yet.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleProvisionTradingWallet}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-[var(--color-brand-400)]"
              >
                {isBusy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Provisioning…
                  </>
                ) : (
                  "Create Trading Account"
                )}
              </button>

              {status === "error" && errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
                  <p className="font-medium">Provisioning failed</p>
                  <p>{errorMessage}</p>
                </div>
              )}

              {status === "success" && result && (
                <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5">
                  <div>
                    <h2 className="text-lg font-semibold">Trading Wallet Ready</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Automated policy and wallet were provisioned successfully.
                    </p>
                  </div>

                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-[var(--text-muted)]">Sub-Organization ID</dt>
                      <dd className="font-mono text-xs">{result.subOrganizationId}</dd>
                    </div>
                    {result.delegatedUserId && (
                      <div>
                        <dt className="text-[var(--text-muted)]">Delegated User ID</dt>
                        <dd className="font-mono text-xs">{result.delegatedUserId}</dd>
                      </div>
                    )}
                    {result.endUserId && (
                      <div>
                        <dt className="text-[var(--text-muted)]">End User ID</dt>
                        <dd className="font-mono text-xs">{result.endUserId}</dd>
                      </div>
                    )}
                    {result.policyId && (
                      <div>
                        <dt className="text-[var(--text-muted)]">Delegated Policy ID</dt>
                        <dd className="font-mono text-xs">{result.policyId}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[var(--text-muted)]">Trading Wallet ID</dt>
                      <dd className="font-mono text-xs">{result.walletId}</dd>
                    </div>
                    {result.addresses.length > 0 && (
                      <div className="space-y-1">
                        <dt className="text-[var(--text-muted)]">Derived Addresses</dt>
                        <dd className="space-y-1">
                          {result.addresses.map((address) => (
                            <div key={address} className="font-mono text-xs break-all">
                              {address}
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetState}
                      className="rounded-lg border border-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-[var(--color-brand-600)] transition hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-500)]/10"
                    >
                      Provision another wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Transfer Popup */}
      {transferPopup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={isDarkMode
            ? "relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl"
            : "relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          }>
            <h3 className={`mb-4 text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Send STX
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={transferPopup.recipientAddress}
                  onChange={(e) => setTransferPopup((prev) => ({ ...prev, recipientAddress: e.target.value }))}
                  placeholder="Enter Stacks address"
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${
                    isDarkMode
                      ? "border-white/10 bg-slate-800 text-white placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Amount (STX)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={transferPopup.amountStx}
                  onChange={(e) => setTransferPopup((prev) => ({ ...prev, amountStx: e.target.value }))}
                  placeholder="Enter amount in STX"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    isDarkMode
                      ? "border-white/10 bg-slate-800 text-white placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleTestTransfer}
                  className="flex-1 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)]"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setTransferPopup((prev) => ({ ...prev, isOpen: false }))}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    isDarkMode
                      ? "border-white/10 text-slate-300 hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingWalletModule;
