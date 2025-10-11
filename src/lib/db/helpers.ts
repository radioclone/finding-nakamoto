import { db } from "./index";
import {
  createTradingOrganization,
  createTradingWallet,
  createTradingWalletAccount,
  getFullTradingOrganizationData,
} from "./queries";

// ============================================================================
// Trading Organization Sync
// ============================================================================

/**
 * Sync trading organization data from Turnkey API to database
 */
export async function syncTradingOrganization(params: {
  userId: string;
  organizationId: string;
  organizationName: string;
  wallets: Array<{
    walletId: string;
    walletName: string;
    accounts: Array<{
      walletAccountId: string;
      walletAccountName: string;
      publicKey: string;
      stacksAddress?: string | null;
    }>;
  }>;
}) {
  const { userId, organizationId, organizationName, wallets } = params;

  // Create or update organization
  const org = await createTradingOrganization({
    organizationId,
    organizationName,
    userId,
  });

  // Sync wallets and accounts
  for (const wallet of wallets) {
    await createTradingWallet({
      walletId: wallet.walletId,
      walletName: wallet.walletName,
      organizationId,
    });

    for (const account of wallet.accounts) {
      await createTradingWalletAccount({
        walletAccountId: account.walletAccountId,
        walletAccountName: account.walletAccountName,
        walletId: wallet.walletId,
        publicKey: account.publicKey,
        stacksAddress: account.stacksAddress,
      });
    }
  }

  return org;
}

// ============================================================================
// Exports
// ============================================================================

export {
  db,
  // Organization queries
  getFullTradingOrganizationData,
};
