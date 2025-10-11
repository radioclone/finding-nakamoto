"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import { getAddressFromPublicKey } from "@stacks/transactions";
import {
  formatSignatureToVRS,
  formatMicroStx,
  isStacksBroadcastError,
} from "../utils/core/signingUtils";
import { useTheme } from "next-themes";
import { useTurnkeyStore, type WalletSummary } from "@/store/useTurnkeyStore";

// Stacks wallet configuration for Turnkey
const STACKS_ACCOUNT_PARAMS = {
  curve: "CURVE_SECP256K1" as const,
  pathFormat: "PATH_FORMAT_BIP32" as const,
  path: "m/44'/5757'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_COMPRESSED" as const,
};

interface StacksWalletInfo {
  publicKey: string;
  testnetAddress: string;
  mainnetAddress: string;
  walletId: string;
}

type StacksWalletVariant = "embedded" | "standalone";

type StacksWalletProps = {
  variant?: StacksWalletVariant;
};

// Skeleton Loader Component
const WalletSkeleton = () => (
  <tr className="animate-pulse">
    <td colSpan={5} className="px-4 py-4">
      <div className="h-5 bg-[var(--bg-subtle)] rounded mb-2"></div>
      <div className="h-4 bg-[var(--bg-subtle)] rounded w-3/4"></div>
    </td>
  </tr>
);

export function StacksWallet({ variant = "standalone" }: StacksWalletProps) {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? (theme === "system" ? systemTheme : theme) ?? "dark";
  const isDarkMode = effectiveTheme === "dark";
  const { authState, user, createWallet,
    handleLogin, logout,
    createWalletAccounts, httpClient, refreshWallets, handleExportWallet } = useTurnkey();

  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletInfo, setWalletInfo] = useState<StacksWalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [creatingAccountForWallet, setCreatingAccountForWallet] = useState<string | null>(null);
  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(null);
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [selectedWalletForAccount, setSelectedWalletForAccount] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; description?: string; type: 'success' | 'error' } | null>(null);
  const [balances, setBalances] = useState<Record<string, { stx_amount: number; sbtc_amount: number; formatted_stx: string; formatted_balance: string } | null>>({});
  const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState(process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS || "");
  const [transferAmount, setTransferAmount] = useState("");
  const [showSbtcTransferModal, setShowSbtcTransferModal] = useState(false);
  const [sbtcTransferRecipient, setSbtcTransferRecipient] = useState("");
  const [sbtcTransferAmount, setSbtcTransferAmount] = useState("");
  const [isSessionPopupDismissed, setIsSessionPopupDismissed] = useState(false);
  const isStandalone = variant === "standalone";
  const {
    wallets: cachedWallets,
    isLoading: storeWalletsLoading,
    initialized: walletsInitialized,
    setWallets: setCachedWallets,
    setLoading: setCachedLoading,
    reset: resetWalletStore,
  } = useTurnkeyStore();
  const isLoadingWallets = storeWalletsLoading;
  const isAuthenticated = authState === AuthState.Authenticated;

  const loadWallets = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setCachedLoading(true);
    try {
      const refreshedWallets = await refreshWallets();
      setCachedWallets(
        Array.isArray(refreshedWallets)
          ? (refreshedWallets as WalletSummary[])
          : []
      );
    } catch (error) {
      console.error("Error loading wallets:", error);
      setCachedWallets([]);
    } finally {
      setCachedLoading(false);
    }
  }, [isAuthenticated, refreshWallets, setCachedLoading, setCachedWallets]);

  const handleRefreshWallets = useCallback(() => {
    if (!isAuthenticated || storeWalletsLoading) {
      return;
    }

    void loadWallets();
  }, [isAuthenticated, storeWalletsLoading, loadWallets]);

  const handlePromptLogin = useCallback(() => {
    handleLogin().catch((error: unknown) => {
      console.error("Failed to trigger login", error);
    });
  }, [handleLogin]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetWalletStore();
      setWallets([]);
      return;
    }

    if (!walletsInitialized && !storeWalletsLoading) {
      void loadWallets();
    }
  }, [isAuthenticated, walletsInitialized, storeWalletsLoading, loadWallets, resetWalletStore]);

  useEffect(() => {
    if (Array.isArray(cachedWallets)) {
      setWallets(cachedWallets as WalletSummary[]);
    } else {
      setWallets([]);
    }
  }, [cachedWallets]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Helper function to check if an account is Stacks-compatible
  const isStacksAccount = (account: any): boolean => {
    return (
      account.curve === "CURVE_SECP256K1" &&
      account.addressFormat === "ADDRESS_FORMAT_COMPRESSED" &&
      account.publicKey &&
      typeof account.publicKey === "string" &&
      account.publicKey.length === 66 // Compressed public key should be 66 hex chars
    );
  };

  useEffect(() => {
    // Fetch balances for all accounts when wallets are loaded
    if (wallets && wallets.length > 0 && !isLoadingWallets) {
      wallets.forEach((wallet: any) => {
        wallet.accounts?.forEach((account: any) => {
          if (isStacksAccount(account) && account.publicKey) {
            try {
              const testnetAddress = getAddressFromPublicKey(account.publicKey, "testnet");
              
              // Only fetch if we haven't already fetched or aren't currently fetching
              if (!balances[testnetAddress] && !loadingBalances[testnetAddress]) {
                fetchBalance(testnetAddress);
              }
            } catch (error) {
              console.error("Error generating Stacks address:", error);
            }
          }
        });
      });
    }
  }, [wallets, isLoadingWallets]);

  const showToast = (title: string, description?: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, description, type });
  };

  const getFriendlyErrorMessage = useCallback((err: unknown, assetLabel: "STX" | "sBTC") => {
    if (isStacksBroadcastError(err)) {
      if (
        err.reason === "NotEnoughFunds" &&
        err.reasonData?.actual !== undefined &&
        err.reasonData?.expected !== undefined
      ) {
        const have = formatMicroStx(err.reasonData.actual);
        const need = formatMicroStx(err.reasonData.expected);
        return `Not enough STX to complete the ${assetLabel} transfer. Available ${have} STX, requires ${need} STX (including fees).`;
      }

      return err.message;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return `Failed to transfer ${assetLabel}`;
  }, []);

  const handleCreateWallet = async () => {
    try {
      setIsCreatingWallet(true);
      setError(null);
       


      const walletName = `Stacks Wallet ${Date.now()}`;
      const walletId = await createWallet({
        walletName,
        accounts: [
          {
            curve: STACKS_ACCOUNT_PARAMS.curve,
            pathFormat: STACKS_ACCOUNT_PARAMS.pathFormat,
            path: STACKS_ACCOUNT_PARAMS.path,
            addressFormat: STACKS_ACCOUNT_PARAMS.addressFormat,
          },
        ],
      });

      const refreshedWallets = await refreshWallets();
      const normalizedWallets = Array.isArray(refreshedWallets)
        ? (refreshedWallets as WalletSummary[])
        : [];
      setCachedWallets(normalizedWallets);
      const newWallet = normalizedWallets.find((w) => w.walletId === walletId);

      if (!newWallet || !newWallet.accounts || newWallet.accounts.length === 0) {
        throw new Error("Failed to retrieve wallet details after creation");
      }

      const account = newWallet.accounts[0];
      const publicKey = account.publicKey;

      if (!publicKey) {
        throw new Error("Public key not found in wallet account");
      }

      const testnetAddress = getAddressFromPublicKey(publicKey, "testnet");
      const mainnetAddress = getAddressFromPublicKey(publicKey, "mainnet");

      const walletData: StacksWalletInfo = {
        publicKey,
        testnetAddress,
        mainnetAddress,
        walletId,
      };

      setWalletInfo(walletData);
      setShowCreateWalletModal(false);

      showToast("Wallet created successfully", undefined, "success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create wallet";
      setError(errorMsg);
      showToast("Error", errorMsg, "error");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleCreateAccount = async (walletId: string) => {
    try {
      setCreatingAccountForWallet(walletId);
      setError(null);

      const wallet = wallets?.find((w: any) => w.walletId === walletId);
      const accountCount = wallet?.accounts?.length || 0;

      await createWalletAccounts({
        walletId,
        accounts: [
          {
            curve: STACKS_ACCOUNT_PARAMS.curve,
            pathFormat: STACKS_ACCOUNT_PARAMS.pathFormat,
            path: `m/44'/5757'/0'/0/${accountCount}`,
            addressFormat: STACKS_ACCOUNT_PARAMS.addressFormat,
          },
        ],
      });

      const refreshedWallets = await refreshWallets();
      setCachedWallets(
        Array.isArray(refreshedWallets)
          ? (refreshedWallets as WalletSummary[])
          : []
      );
      setShowCreateAccountModal(false);
      setSelectedWalletForAccount(null);

      showToast("Account created successfully", undefined, "success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create account";
      setError(errorMsg);
      showToast("Error", errorMsg, "error");
    } finally {
      setCreatingAccountForWallet(null);
    }
  };

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

  const handleTransferSTX = async () => {
    if (!transferRecipient || !transferAmount) {
      showToast("Error", "Please enter recipient address and amount", "error");
      return;
    }

    try {
      setIsSigning(true);
      setError(null);

      if (!walletInfo || !httpClient) {
        throw new Error("No wallet found or not logged in");
      }

      const amountInMicroSTX = BigInt(Math.floor(parseFloat(transferAmount) * 1_000_000));

      const { signAndBroadcastStacksTransaction } = await import("../utils/transactions/transferStx");

      console.log('=== Transfer STX Flow ===');
      console.log('Wallet Info:');
      console.log('  Public Key:', walletInfo.publicKey);
      console.log('  Public Key Length:', walletInfo.publicKey.length);
      console.log('  Public Key Prefix:', walletInfo.publicKey.substring(0, 2));
      console.log('  Testnet Address:', walletInfo.testnetAddress);
      console.log('  Wallet ID:', walletInfo.walletId);

      // Validate public key format
      if (walletInfo.publicKey.length !== 66) {
        throw new Error(`Invalid public key length: ${walletInfo.publicKey.length}, expected 66 (compressed)`);
      }
      if (!walletInfo.publicKey.startsWith('02') && !walletInfo.publicKey.startsWith('03')) {
        throw new Error(`Invalid public key prefix: ${walletInfo.publicKey.substring(0, 2)}, expected 02 or 03 (compressed)`);
      }

      

      const signFunction = async (payload: string) => {
        console.log('=== Turnkey Signing ===');
        console.log('Signing with public key:', walletInfo.publicKey);
        console.log('Payload to sign:', payload);

        const signature = await httpClient.signRawPayload({
          signWith: walletInfo.publicKey,
          payload: payload.startsWith("0x") ? payload : `0x${payload}`,
          encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
          hashFunction: "HASH_FUNCTION_NO_OP",
        });

        console.log('Signature received from Turnkey:');
        console.log('  v:', signature!.v);
        console.log('  v length:', signature!.v.length);
        console.log('  r:', signature!.r);
        console.log('  r length:', signature!.r.length);
        console.log('  s:', signature!.s);
        console.log('  s length:', signature!.s.length);

        // Format signature to VRS (130 chars) - Turnkey provides correct V
        const vrsSignature = formatSignatureToVRS(signature!);
        console.log('Returning VRS signature (length:', vrsSignature.length, ')');
        console.log('======================');

        return vrsSignature;
      };

      const { txId } = await signAndBroadcastStacksTransaction({
        recipientAddress: transferRecipient,
        amount: amountInMicroSTX,
        senderAddress: walletInfo.testnetAddress,
        publicKey: walletInfo.publicKey,
        network: "testnet",
        fee: BigInt(14640),
        memo: "",
        signFunction,
      });

      setSignatureResult(txId);
      setShowTransferModal(false);
      setTransferRecipient("");
      setTransferAmount("");

      showToast("Transaction broadcast successfully", `TX ID: ${txId.substring(0, 20)}...`, "success");
    } catch (err) {
      console.error('Failed to transfer STX:', err);
      const errorMsg = getFriendlyErrorMessage(err, "STX");
      setError(errorMsg);
      showToast("Error", errorMsg, "error");
      setShowTransferModal(false);
      setTransferRecipient("");
      setTransferAmount("");
    } finally {
      setIsSigning(false);
    }
  };

  const handleTransferSBTC = async () => {
    if (!sbtcTransferRecipient || !sbtcTransferAmount) {
      showToast("Error", "Please enter recipient address and amount", "error");
      return;
    }

    try {
      setIsSigning(true);
      setError(null);

      if (!walletInfo || !httpClient) {
        throw new Error("No wallet found or not logged in");
      }

      const amountInSats = BigInt(Math.floor(parseFloat(sbtcTransferAmount) * 100_000_000));

      const { signAndBroadcastSbtcTransaction } = await import("../utils/transactions/transferSbtc");

      console.log('=== Transfer sBTC Flow ===');
      console.log('Wallet Info:');
      console.log('  Public Key:', walletInfo.publicKey);
      console.log('  Testnet Address:', walletInfo.testnetAddress);
      console.log('  Wallet ID:', walletInfo.walletId);

      
      

      

      const signFunction = async (payload: string) => {
        console.log('=== Turnkey Signing ===');
        console.log('Signing with public key:', walletInfo.publicKey);
        console.log('Payload to sign:', payload);

        const signature = await httpClient.signRawPayload({
          signWith: walletInfo.publicKey,
          payload: payload.startsWith("0x") ? payload : `0x${payload}`,
          encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
          hashFunction: "HASH_FUNCTION_NO_OP",
        });

        console.log('Signature received from Turnkey:');
        console.log('  v:', signature!.v);
        console.log('  v length:', signature!.v.length);
        console.log('  r:', signature!.r);
        console.log('  r length:', signature!.r.length);
        console.log('  s:', signature!.s);
        console.log('  s length:', signature!.s.length);

        // Format signature to VRS (130 chars) - Turnkey provides correct V
        const vrsSignature = formatSignatureToVRS(signature!);
        console.log('Returning VRS signature (length:', vrsSignature.length, ')');
        console.log('======================');

        return vrsSignature;
      };

      const { txId } = await signAndBroadcastSbtcTransaction({
        recipientAddress: sbtcTransferRecipient,
        amount: amountInSats,
        senderAddress: walletInfo.testnetAddress,
        publicKey: walletInfo.publicKey,
        network: "testnet",
        fee: BigInt(14640),
        memo: "",
        signFunction,
      });

      setSignatureResult(txId);
      setShowSbtcTransferModal(false);
      setSbtcTransferRecipient("");
      setSbtcTransferAmount("");

      showToast("sBTC Transaction broadcast successfully", `TX ID: ${txId.substring(0, 20)}...`, "success");
    } catch (err) {
      console.error('Failed to transfer sBTC:', err);
      const errorMsg = getFriendlyErrorMessage(err, "sBTC");
      setError(errorMsg);
      showToast("Error", errorMsg, "error");
      setShowSbtcTransferModal(false);
      setSbtcTransferRecipient("");
      setSbtcTransferAmount("");
    } finally {
      setIsSigning(false);
    }
  };

  const filteredWallets = wallets?.filter((wallet) => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(wallet.walletId);
  }) || [];

  // Calculate total portfolio value
  const portfolioValue = {
    totalStx: 0,
    totalSbtc: 0,
    loadedAccounts: 0,
    totalAccounts: 0
  };

  filteredWallets.forEach((wallet: any) => {
    wallet.accounts?.forEach((account: any) => {
      
      if (isStacksAccount(account) && account.publicKey) {
        try {
          portfolioValue.totalAccounts++;
          const testnetAddress = getAddressFromPublicKey(account.publicKey, "testnet");
          const balance = balances[testnetAddress];
          if (balance) {
            portfolioValue.loadedAccounts++;
            portfolioValue.totalStx += balance.stx_amount;
            portfolioValue.totalSbtc += balance.sbtc_amount;
          }
        } catch (error) {
          console.error("Error calculating portfolio for account:", error);
        }
      }
    });
  });

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className={`rounded-lg border px-4 py-3 shadow-lg ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          }`}>
            <p className={`font-semibold ${
              toastMessage.type === 'success' ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'
            }`}>
              {toastMessage.title}
            </p>
            {toastMessage.description && (
              <p className={`text-sm mt-1 ${
                toastMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {toastMessage.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create Wallet Modal */}
      {showCreateWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateWalletModal(false)}></div>
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-2">Create New Wallet</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Create a new Stacks-compatible wallet with a secure account.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => setShowCreateWalletModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium hover:from-brand-400 hover:to-purple-400 transition-all disabled:opacity-50"
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
              >
                {isCreatingWallet ? "Creating..." : "Create Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && selectedWalletForAccount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowCreateAccountModal(false);
            setSelectedWalletForAccount(null);
          }}></div>
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-2">Create New Account</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Add a new account to your wallet. Each account has its own address.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setSelectedWalletForAccount(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-all disabled:opacity-50"
                onClick={() => selectedWalletForAccount && handleCreateAccount(selectedWalletForAccount)}
                disabled={creatingAccountForWallet !== null}
              >
                {creatingAccountForWallet !== null ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer STX Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowTransferModal(false);
            setTransferRecipient("");
            setTransferAmount("");
          }}></div>
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-2">Transfer STX</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Send STX to another address on the testnet.
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder={process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS || ""}
                  disabled={isSigning}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (STX)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.000000"
                  disabled={isSigning}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferRecipient("");
                  setTransferAmount("");
                }}
                disabled={isSigning}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-all disabled:opacity-50"
                onClick={handleTransferSTX}
                disabled={isSigning || !transferRecipient || !transferAmount}
              >
                {isSigning ? "Sending..." : "Send STX"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer sBTC Modal */}
      {showSbtcTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowSbtcTransferModal(false);
            setSbtcTransferRecipient("");
            setSbtcTransferAmount("");
          }}></div>
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-2">Transfer sBTC</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Send sBTC to another address on the testnet.
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={sbtcTransferRecipient}
                  onChange={(e) => setSbtcTransferRecipient(e.target.value)}
                  placeholder={process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS || ""}
                  disabled={isSigning}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (sBTC)</label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sbtcTransferAmount}
                  onChange={(e) => setSbtcTransferAmount(e.target.value)}
                  placeholder="0.00000000"
                  disabled={isSigning}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => {
                  setShowSbtcTransferModal(false);
                  setSbtcTransferRecipient("");
                  setSbtcTransferAmount("");
                }}
                disabled={isSigning}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-400 transition-all disabled:opacity-50"
                onClick={handleTransferSBTC}
                disabled={isSigning || !sbtcTransferRecipient || !sbtcTransferAmount}
              >
                {isSigning ? "Sending..." : "Send sBTC"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={isStandalone ? "min-h-screen bg-[var(--bg-canvas)]" : "flex flex-col gap-6"}>
        {isStandalone ? (
          <div className="bg-gradient-to-r from-brand-500 to-purple-500 border-b border-[var(--border-subtle)] py-6 px-8">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <h1 className="text-3xl font-bold text-white">Stacks Wallet</h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                {authState === AuthState.Authenticated && (
                  <button
                    className="px-4 py-2 rounded-lg hover:bg-white/20 transition-colors text-white font-medium"
                    onClick={() => logout()}
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        <div className={isStandalone ? "max-w-7xl mx-auto p-8" : ""}>
          <div className="flex flex-col gap-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-900 dark:text-red-100 text-sm">{error}</p>
              </div>
            )}

            {/* Not Authenticated State */}
            {authState !== AuthState.Authenticated && (
              <div className="flex flex-col items-center gap-6 py-12">
                <div className="text-center">
                  <p className="text-6xl mb-4">🚀</p>
                  <h2 className="text-4xl font-bold mb-2">Welcome to Stacks Wallet</h2>
                  <p className="text-[var(--text-muted)] text-lg">Secure, simple, and powered by Turnkey</p>
                </div>
                <button
                  className="px-12 py-4 text-lg rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium hover:from-brand-400 hover:to-purple-400 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  onClick={() => handleLogin()}
                >
                  Connect with Turnkey
                </button>
              </div>
            )}

            {/* Authenticated - Wallet List */}
            {authState === AuthState.Authenticated && !walletInfo && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-3xl font-bold">Your Wallets</h2>
                  <div className="flex items-center gap-3">
                    {user?.userName && (
                      <p className="text-[var(--text-muted)]">👋 {user.userName}</p>
                    )}
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                      onClick={handleRefreshWallets}
                      disabled={!isAuthenticated || isLoadingWallets}
                      type="button"
                    >
                      {isLoadingWallets ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                </div>

                {/* Portfolio Overview */}
                {!isLoadingWallets && portfolioValue.totalAccounts > 0 && (
                  <div className="bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-blue-500/10 border-2 border-brand-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">💰</span>
                      <h3 className="text-2xl font-bold">Total Portfolio</h3>
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
                )}

                {/* Skeleton Loading */}
                {isLoadingWallets && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <WalletSkeleton key={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Wallet List */}
                {!isLoadingWallets && filteredWallets.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                      <thead className="bg-[var(--bg-subtle)]">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"></th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Wallet</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Wallet ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Accounts</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {filteredWallets.map((wallet) => {
                          const stacksAccountCount = wallet.accounts?.filter(isStacksAccount).length ?? 0;
                          const isExpanded = expandedWalletId === wallet.walletId;
                          return (
                            <Fragment key={wallet.walletId}>
                              <tr className="hover:bg-[var(--bg-subtle)] transition-colors">
                                <td className="px-4 py-4 align-top">
                                  <button
                                    className="p-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                                    onClick={() => setExpandedWalletId(isExpanded ? null : wallet.walletId)}
                                    aria-label={isExpanded ? "Collapse wallet accounts" : "Expand wallet accounts"}
                                    aria-expanded={isExpanded}
                                  >
                                    {isExpanded ? "▼" : "▶"}
                                  </button>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <p className="text-sm font-semibold mb-1">{wallet.walletName}</p>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <p className="text-xs text-[var(--text-muted)] font-mono break-all">{wallet.walletId}</p>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <button
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                    onClick={() => setExpandedWalletId(isExpanded ? null : wallet.walletId)}
                                  >
                                    {stacksAccountCount} account{stacksAccountCount === 1 ? "" : "s"}
                                  </button>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex gap-2">
                                    <button
                                      className="py-2 px-3 text-sm rounded-lg border-2 border-emerald-500 text-emerald-500 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all"
                                      onClick={() => {
                                        setSelectedWalletForAccount(wallet.walletId);
                                        setShowCreateAccountModal(true);
                                      }}
                                    >
                                      + New Account
                                    </button>
                                    <button
                                      className="py-2 px-3 text-sm rounded-lg border-2 border-blue-500 text-blue-500 font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
                                      onClick={async () => {
                                        try {
                                          await handleExportWallet({ walletId: wallet.walletId });
                                        } catch (err) {
                                          const errorMsg = err instanceof Error ? err.message : "Failed to export wallet";
                                          showToast("Error", errorMsg, "error");
                                        }
                                      }}
                                    >
                                      Export
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-[var(--bg-subtle)]">
                                  <td className="px-4 py-4 align-top"></td>
                                  <td colSpan={4} className="px-4 py-4 align-top">
                                    {stacksAccountCount > 0 ? (
                                      <div className="flex flex-col gap-3">
                                        {wallet.accounts?.map((account: any, idx: number) => {
                                          if (!isStacksAccount(account) || !account.publicKey) return null;

                                          const publicKey = account.publicKey;
                                          let testnetAddress: string;
                                          try {
                                            testnetAddress = getAddressFromPublicKey(publicKey, "testnet");
                                          } catch (error) {
                                            console.error("Error generating address for account:", error);
                                            return null;
                                          }

                                          const balance = balances[testnetAddress];
                                          const isLoadingBalance = loadingBalances[testnetAddress];
                                          return (
                                            <div
                                              key={idx}
                                              className="flex flex-col gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                                            >
                                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                <div className="flex-1">
                                                  <p className="text-xs font-semibold mb-1">Account {idx + 1}</p>
                                                  <p className="text-xs text-[var(--text-muted)] font-mono break-all mb-3">{testnetAddress}</p>

                                                  {/* Balance Display */}
                                                  {isLoadingBalance ? (
                                                    <div className="flex gap-4 animate-pulse">
                                                      <div className="h-10 bg-[var(--bg-subtle)] rounded w-32"></div>
                                                      <div className="h-10 bg-[var(--bg-subtle)] rounded w-32"></div>
                                                    </div>
                                                  ) : balance ? (
                                                    <div className="flex flex-wrap gap-3">
                                                      <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg px-3 py-2">
                                                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide mb-0.5">STX Balance</p>
                                                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{balance.formatted_stx}</p>
                                                      </div>
                                                      <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide mb-0.5">sBTC Balance</p>
                                                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{balance.formatted_balance}</p>
                                                      </div>
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <div className="flex flex-col items-start gap-2 md:items-end">
                                                  <button
                                                    className="w-full py-2 text-sm rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium hover:from-brand-400 hover:to-purple-400 transition-all md:w-auto md:min-w-[160px]"
                                                    onClick={() => {
                                                      try {
                                                        const mainnetAddress = getAddressFromPublicKey(publicKey, "mainnet");
                                                        setWalletInfo({
                                                          publicKey,
                                                          testnetAddress,
                                                          mainnetAddress,
                                                          walletId: wallet.walletId,
                                                        });
                                                        // Fetch balance if not already loaded
                                                        if (!balances[testnetAddress] && !loadingBalances[testnetAddress]) {
                                                          fetchBalance(testnetAddress);
                                                        }
                                                      } catch (error) {
                                                        console.error("Error selecting account:", error);
                                                        showToast("Error", "Failed to select account", "error");
                                                      }
                                                    }}
                                                  >
                                                    Select Account
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-[var(--text-muted)]">
                                        No accounts yet. Create one to get started.
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* No Wallets State */}
                {!isLoadingWallets && filteredWallets.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <p className="text-5xl">💼</p>
                    <p className="text-[var(--text-muted)]">No wallets yet. Create your first one!</p>
                  </div>
                )}

                {/* Create Wallet Button */}
                {!isLoadingWallets && (
                  <button
                    className="py-4 text-lg rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium hover:from-brand-400 hover:to-purple-400 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    onClick={() => setShowCreateWalletModal(true)}
                  >
                    + Create New Wallet
                  </button>
                )}
              </div>
            )}

            {/* Wallet Detail View */}
            {walletInfo && (
              <div className="flex flex-col gap-6">
                <button
                  className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors w-fit"
                  onClick={() => setWalletInfo(null)}
                >
                  <span>←</span>
                  <span>Back to Wallets</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Account Info Card */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-6xl">💎</p>
                      <div className="flex flex-col gap-3 w-full">
                        <div className="w-full">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Testnet Address</p>
                          <div className="bg-[var(--bg-subtle)] rounded-md p-3">
                            <p className="text-xs font-mono break-all">
                              {walletInfo.testnetAddress}
                            </p>
                          </div>
                        </div>
                        <div className="w-full">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Public Key</p>
                          <div className="bg-[var(--bg-subtle)] rounded-md p-3">
                            <p className="text-xs font-mono break-all">
                              {walletInfo.publicKey}
                            </p>
                          </div>
                        </div>

                        {/* Balance Display */}
                        {(() => {
                          const balance = balances[walletInfo.testnetAddress];
                          const isLoadingBalance = loadingBalances[walletInfo.testnetAddress];

                          return (
                            <div className="w-full mt-2">
                              <p className="text-xs text-[var(--text-muted)] mb-2">Balance</p>
                              {isLoadingBalance ? (
                                <div className="flex flex-col gap-2 animate-pulse">
                                  <div className="h-16 bg-[var(--bg-subtle)] rounded-lg"></div>
                                  <div className="h-16 bg-[var(--bg-subtle)] rounded-lg"></div>
                                </div>
                              ) : balance ? (
                                <div className="flex flex-col gap-2">
                                  <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg px-3 py-2">
                                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide mb-0.5">STX Balance</p>
                                    <p className="text-base font-bold text-orange-700 dark:text-orange-300">{balance.formatted_stx}</p>
                                  </div>
                                  <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide mb-0.5">sBTC Balance</p>
                                    <p className="text-base font-bold text-blue-700 dark:text-blue-300">{balance.formatted_balance}</p>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="w-full py-2 text-sm rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all"
                                  onClick={() => fetchBalance(walletInfo.testnetAddress)}
                                >
                                  Load Balance
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6">
                      <h3 className="text-2xl font-bold mb-4">Actions</h3>
                      <div className="flex flex-col gap-3">
                        <button
                          className="w-full py-3 text-lg rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-all disabled:opacity-50"
                          onClick={() => setShowTransferModal(true)}
                          disabled={isSigning}
                        >
                          Transfer STX
                        </button>
                        <button
                          className="w-full py-3 text-lg rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-400 transition-all disabled:opacity-50"
                          onClick={() => setShowSbtcTransferModal(true)}
                          disabled={isSigning}
                        >
                          Transfer sBTC
                        </button>
                      </div>
                    </div>

                    {/* Signature Result */}
                    {signatureResult && (
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-500 rounded-lg p-4">
                        <p className="text-xs text-blue-500 font-semibold mb-2">
                          Transaction Result:
                        </p>
                        <p className="text-xs font-mono break-all mb-2">
                          {signatureResult}
                        </p>
                        <a
                          href={`https://explorer.hiro.so/txid/${signatureResult}?chain=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold underline"
                        >
                          View on Explorer →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isStandalone && (
          <div className="border-t border-[var(--border-subtle)] py-4">
            <p className="text-center text-xs text-[var(--text-muted)]">
              🔒 Secured by Turnkey × Stacks
            </p>
          </div>
        )}
      </div>

      {!isAuthenticated && !isSessionPopupDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsSessionPopupDismissed(true)}
          />
          <div className="relative max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-slate-100 shadow-xl">
            <button
              type="button"
              onClick={() => setIsSessionPopupDismissed(true)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold">Session required</h2>
            <p className="mt-2 text-sm text-slate-300">
              Reconnect with Turnkey to continue managing your holding wallet.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePromptLogin}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)]"
              >
                Reconnect with Turnkey
              </button>
              <button
                type="button"
                onClick={() => setIsSessionPopupDismissed(true)}
                className="text-xs text-slate-400 transition hover:text-slate-200"
              >
                Browse without signing in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
