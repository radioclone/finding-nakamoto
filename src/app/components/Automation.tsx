"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useTurnkeyStore } from "@/store/useTurnkeyStore";
import { getAddressFromPublicKey } from "@stacks/transactions";

// Fixed exchange rate: 1 STX = 500 satoshis = 0.00000500 sBTC
const FIXED_EXCHANGE_RATE = "1 STX = 500 satoshis (0.00000500 sBTC)";

type AutomationStep = "swap_stx_to_sbtc" | "swap_sbtc_to_stx" | "transfer_stx";
type StepStatus = "pending" | "in_progress" | "completed" | "error";

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

type AutomationStepState = {
  step: AutomationStep;
  status: StepStatus;
  message?: string;
  txId?: string;
};

type AutomationFormState = {
  tradingAccountKey: string;
  amount: string;
  destinationAddress: string;
};

type AutomationState = {
  status: "idle" | "running" | "completed" | "error";
  currentStepIndex: number;
  steps: AutomationStepState[];
  message?: string;
};

type AutomationProps = {
  flattenedAccounts: FlattenedTradingAccount[];
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

export function Automation({ flattenedAccounts }: AutomationProps) {
  const { theme, systemTheme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? (theme === "system" ? systemTheme : theme) ?? "dark";
  const isDarkMode = effectiveTheme === "dark";
  const { wallets } = useTurnkeyStore();

  const [formError, setFormError] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<{
    stx: string;
    sbtc: string;
    loading: boolean;
  }>({
    stx: "0",
    sbtc: "0",
    loading: false,
  });

  const [automationForm, setAutomationForm] = useState<AutomationFormState>(() => {
    return {
      tradingAccountKey: "",
      amount: "",
      destinationAddress: "",
    };
  });

  const [automationState, setAutomationState] = useState<AutomationState>({
    status: "idle",
    currentStepIndex: 0,
    steps: [
      { step: "swap_stx_to_sbtc", status: "pending" },
      { step: "swap_sbtc_to_stx", status: "pending" },
      { step: "transfer_stx", status: "pending" },
    ],
  });

  const selectedAccount = useMemo(
    () =>
      flattenedAccounts.find(
        (account) => account.key === automationForm.tradingAccountKey
      ) || null,
    [flattenedAccounts, automationForm.tradingAccountKey]
  );

  // Helper function to check if an account is Stacks-compatible (same as StacksWallet.tsx)
  const isStacksAccount = (account: any): boolean => {
    return (
      account.curve === "CURVE_SECP256K1" &&
      account.addressFormat === "ADDRESS_FORMAT_COMPRESSED" &&
      account.publicKey &&
      typeof account.publicKey === "string" &&
      account.publicKey.length === 66 // Compressed public key should be 66 hex chars
    );
  };

  const destinationOptions = useMemo(() => {
    if (!wallets || wallets.length === 0) {
      return [];
    }

    const options: Array<{ label: string; address: string }> = [];

    wallets.forEach((wallet: any) => {
      // Filter to only UUID wallets (same as StacksWallet.tsx)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(wallet.walletId)) {
        return;
      }

      wallet.accounts?.forEach((account: any, idx: number) => {
        // Only include Stacks-compatible accounts
        if (!isStacksAccount(account) || !account.publicKey) {
          return;
        }

        try {
          const testnetAddress = getAddressFromPublicKey(account.publicKey, "testnet");

          options.push({
            label: testnetAddress,
            address: testnetAddress,
          });
        } catch (error) {
          console.error("Error generating Stacks address for account:", error);
        }
      });
    });

    return options;
  }, [wallets]);

  const stepLabels: Record<AutomationStep, string> = {
    swap_stx_to_sbtc: "1. Swap STX → sBTC",
    swap_sbtc_to_stx: "2. Swap sBTC → STX",
    transfer_stx: "3. Transfer STX to Holding Wallet",
  };

  const stepDescriptions: Record<AutomationStep, string> = {
    swap_stx_to_sbtc: "Converting STX to sBTC using AMM",
    swap_sbtc_to_stx: "Converting sBTC back to STX",
    transfer_stx: "Transferring STX to destination address",
  };

  const updateFormField = <K extends keyof AutomationFormState>(
    field: K,
    value: AutomationFormState[K]
  ) => {
    setAutomationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormError(null);
  };

  const isInsufficientBalance = useMemo(() => {
    if (!automationForm.amount.trim() || accountBalance.loading) {
      return false;
    }
    const requestedAmount = parseFloat(automationForm.amount);
    const availableStx = parseFloat(accountBalance.stx);
    const estimatedFees = 0.03;
    return requestedAmount + estimatedFees >= availableStx;
  }, [automationForm.amount, accountBalance]);

  const fetchAccountBalance = useCallback(async () => {
    if (!selectedAccount || !selectedAccount.stacksAddress) {
      setAccountBalance({ stx: "0", sbtc: "0", loading: false });
      return;
    }

    setAccountBalance((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch(
        `https://api.testnet.hiro.so/extended/v1/address/${selectedAccount.stacksAddress}/balances`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await response.json();

      const stxBalance = BigInt(data.stx?.balance || "0");
      const stxFormatted = (Number(stxBalance) / 1_000_000).toFixed(6);

      const sbtcToken = data.fungible_tokens?.["ST339A455EK9PAY9NP81WHK73T1JMFC3NN0321T18.sbtc-token::sbtc"];
      const sbtcBalance = BigInt(sbtcToken?.balance || "0");
      const sbtcFormatted = (Number(sbtcBalance) / 100_000_000).toFixed(8);

      setAccountBalance({
        stx: stxFormatted,
        sbtc: sbtcFormatted,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      setAccountBalance({ stx: "0", sbtc: "0", loading: false });
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (flattenedAccounts.length === 0) {
      return;
    }

    setAutomationForm((prev) => {
      if (prev.tradingAccountKey && flattenedAccounts.some((account) => account.key === prev.tradingAccountKey)) {
        return prev;
      }

      return {
        ...prev,
        tradingAccountKey: flattenedAccounts[0].key,
      };
    });
  }, [flattenedAccounts]);

  useEffect(() => {
    if (destinationOptions.length === 0) {
      setAutomationForm((prev) => ({
        ...prev,
        destinationAddress: "",
      }));
      return;
    }

    if (automationForm.destinationAddress && destinationOptions.some((opt) => opt.address === automationForm.destinationAddress)) {
      return;
    }

    setAutomationForm((prev) => ({
      ...prev,
      destinationAddress: destinationOptions[0].address,
    }));
  }, [destinationOptions, automationForm.destinationAddress]);

  useEffect(() => {
    fetchAccountBalance();
  }, [fetchAccountBalance]);

  const resetAutomation = () => {
    setAutomationState({
      status: "idle",
      currentStepIndex: 0,
      steps: [
        { step: "swap_stx_to_sbtc", status: "pending" },
        { step: "swap_sbtc_to_stx", status: "pending" },
        { step: "transfer_stx", status: "pending" },
      ],
    });
  };

  const handleStartAutomation = async () => {
    setFormError(null);

    if (!selectedAccount) {
      setFormError("Select a trading wallet account");
      return;
    }

    if (!automationForm.amount.trim()) {
      setFormError("Enter an amount");
      return;
    }

    if (!automationForm.destinationAddress) {
      setFormError("Choose a Holding Wallet destination");
      return;
    }

    // Check if user has sufficient balance
    const requestedAmount = parseFloat(automationForm.amount);
    const availableStx = parseFloat(accountBalance.stx);
    const estimatedFees = 0.03; // Estimated total fees for all 3 transactions (0.01 STX each)

    if (requestedAmount + estimatedFees >= availableStx) {
      setFormError(
        `Insufficient balance. You need at least ${(requestedAmount + estimatedFees).toFixed(6)} STX (including ~${estimatedFees} STX for fees). Available: ${availableStx} STX`
      );
      return;
    }

    try {
      const amountBaseUnit = toBaseUnits(automationForm.amount, 6);

      setAutomationState({
        status: "running",
        currentStepIndex: 0,
        steps: [
          { step: "swap_stx_to_sbtc", status: "pending" },
          { step: "swap_sbtc_to_stx", status: "pending" },
          { step: "transfer_stx", status: "pending" },
        ],
      });

      // Execute automation steps sequentially
      await executeAutomationSteps(
        selectedAccount.walletAccountId,
        amountBaseUnit,
        automationForm.destinationAddress
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Automation failed");
      setAutomationState((prev) => ({ ...prev, status: "error" }));
    }
  };

  const executeAutomationSteps = async (
    walletAccountId: string,
    amountBaseUnit: string,
    destinationAddress: string
  ) => {
    const steps: AutomationStep[] = ["swap_stx_to_sbtc", "swap_sbtc_to_stx", "transfer_stx"];

    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];

      // Update step to in_progress
      setAutomationState((prev) => ({
        ...prev,
        currentStepIndex: i,
        steps: prev.steps.map((s, idx) =>
          idx === i ? { ...s, status: "in_progress" as StepStatus } : s
        ),
      }));

      try {
        // Execute step via API
        const response = await fetch("/api/turnkey/automation-step", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAccountId,
            step: currentStep,
            amountBaseUnit,
            destinationAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Step ${i + 1} failed`);
        }

        // Mark step as completed
        setAutomationState((prev) => ({
          ...prev,
          steps: prev.steps.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: "completed" as StepStatus,
                  message: result.message,
                  txId: result.txId,
                }
              : s
          ),
        }));

        // Wait a bit before next step for visual effect
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        // Mark step as error
        setAutomationState((prev) => ({
          ...prev,
          status: "error",
          steps: prev.steps.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: "error" as StepStatus,
                  message: error instanceof Error ? error.message : "Step failed",
                }
              : s
          ),
        }));
        throw error;
      }
    }

    // All steps completed
    setAutomationState((prev) => ({
      ...prev,
      status: "completed",
      currentStepIndex: steps.length,
    }));

    // Refresh balance after completion
    await fetchAccountBalance();
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-semibold">Automated Swap Demo</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Watch automated multi-step swaps in action with fixed rate: {FIXED_EXCHANGE_RATE}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            <a
              href="https://explorer.hiro.so/txid/ST339A455EK9PAY9NP81WHK73T1JMFC3NN0321T18.simple-amm-v4?chain=testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-brand-600)]"
            >
              View AMM Contract →
            </a>
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form
          className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleStartAutomation();
          }}
        >
          <h3 className="text-base font-semibold">Setup Automation</h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Trading account
              </label>
              <select
                value={automationForm.tradingAccountKey}
                onChange={(event) => updateFormField("tradingAccountKey", event.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                disabled={flattenedAccounts.length === 0 || automationState.status === "running"}
              >
                {flattenedAccounts.length === 0 ? (
                  <option value="">No trading accounts available</option>
                ) : (
                  flattenedAccounts.map((account) => (
                    <option key={account.key} value={account.key}>
                      {account.stacksAddress || account.walletAccountId || account.key}
                    </option>
                  ))
                )}
              </select>
              {selectedAccount && (
                <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Account Balance
                    </p>
                    <button
                      type="button"
                      onClick={fetchAccountBalance}
                      disabled={accountBalance.loading}
                      className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--color-brand-600)] disabled:cursor-not-allowed disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <svg
                        className={`h-3.5 w-3.5 ${accountBalance.loading ? "animate-spin" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                  {accountBalance.loading ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <svg
                        className="h-4 w-4 animate-spin text-[var(--color-brand-600)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">STX:</span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {accountBalance.stx}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">sBTC:</span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {accountBalance.sbtc}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Amount (STX)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={automationForm.amount}
                onChange={(event) => updateFormField("amount", event.target.value)}
                placeholder="1"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isInsufficientBalance
                    ? "border-red-300 bg-red-50 focus:ring-red-500"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] focus:ring-[var(--color-brand-500)]"
                }`}
                disabled={automationState.status === "running"}
              />
              {isInsufficientBalance && (
                <div className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-600">
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    Insufficient balance for amount + fees (~0.03 STX). Available: {accountBalance.stx} STX
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {["1", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateFormField("amount", preset)}
                    className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={automationState.status === "running"}
                  >
                    {preset} STX
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Destination Holding Wallet
              </label>
              {destinationOptions.length > 0 ? (
                <select
                  value={automationForm.destinationAddress}
                  onChange={(event) => updateFormField("destinationAddress", event.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  disabled={automationState.status === "running"}
                >
                  {destinationOptions.map((option) => (
                    <option key={option.address} value={option.address}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)]">
                  No Holding Wallet addresses available. Create or import a wallet in the Holding Wallet tab.
                </p>
              )}
            </div>
          </div>

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              <p className="font-semibold">{formError}</p>
              {formError.toLowerCase().includes("insufficient balance") && selectedAccount?.stacksAddress && (
                <div className="mt-2 space-y-1">
                  <p className="text-red-500">Get testnet STX from the faucet:</p>
                  <a
                    href={`https://platform.hiro.so/faucet?address=${selectedAccount.stacksAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-red-700 underline hover:text-red-800"
                  >
                    Request STX from Faucet →
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {automationState.status === "completed" && (
              <button
                type="button"
                onClick={resetAutomation}
                className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)]"
              >
                Reset
              </button>
            )}
            <button
              type="submit"
              disabled={automationState.status === "running" || !selectedAccount || destinationOptions.length === 0}
              className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-[var(--color-brand-400)]"
            >
              {automationState.status === "running" ? "Running…" : "Start Automation"}
            </button>
          </div>
        </form>

        <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-base font-semibold">Automation Progress</h3>

          <div className="space-y-3">
            {automationState.steps.map((stepState, idx) => {
              const isActive = automationState.currentStepIndex === idx && automationState.status === "running";
              const isCompleted = stepState.status === "completed";
              const isError = stepState.status === "error";
              const isPending = stepState.status === "pending";

              let bgColor = "bg-[var(--bg-subtle)]";
              let borderColor = "border-[var(--border-subtle)]";
              let textColor = "text-[var(--text-secondary)]";

              if (isActive) {
                bgColor = "bg-blue-500/10";
                borderColor = "border-blue-500/40";
                textColor = "text-blue-600";
              } else if (isCompleted) {
                bgColor = "bg-emerald-500/10";
                borderColor = "border-emerald-500/40";
                textColor = "text-emerald-600";
              } else if (isError) {
                bgColor = "bg-red-500/10";
                borderColor = "border-red-500/40";
                textColor = "text-red-600";
              }

              return (
                <div
                  key={stepState.step}
                  className={`space-y-2 rounded-lg border p-4 transition-all ${bgColor} ${borderColor}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <svg
                            className="h-5 w-5 flex-shrink-0 text-emerald-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {isActive && (
                          <svg
                            className="h-5 w-5 flex-shrink-0 animate-spin text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        )}
                        {isError && (
                          <svg
                            className="h-5 w-5 flex-shrink-0 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        {isPending && (
                          <div className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-[var(--border-subtle)]" />
                        )}
                        <p className={`text-sm font-semibold ${textColor}`}>
                          {stepLabels[stepState.step]}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {stepDescriptions[stepState.step]}
                      </p>
                    </div>
                  </div>

                  {stepState.message && (
                    <div className="rounded-md bg-[var(--bg-surface)] px-3 py-2">
                      <p className="text-xs text-[var(--text-secondary)]">{stepState.message}</p>
                    </div>
                  )}

                  {stepState.txId && (
                    <a
                      href={`https://explorer.hiro.so/txid/${stepState.txId}?chain=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-600)] hover:underline"
                    >
                      View Transaction →
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {automationState.status === "completed" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-600">
              <p className="font-semibold">✓ Automation completed successfully!</p>
              <p className="mt-1">All steps executed and STX transferred to holding wallet.</p>
            </div>
          )}

          {automationState.status === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              <p className="font-semibold">✗ Automation failed</p>
              <p className="mt-1">Check the error message above for details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
