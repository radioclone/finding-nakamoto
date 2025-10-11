import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import {
  tradingOrganizations,
  tradingWallets,
  tradingWalletAccounts,
} from "./schema";

// ============================================================================
// Trading Organizations
// ============================================================================

export async function createTradingOrganization(data: {
  organizationId: string;
  organizationName: string;
  userId: string;
}) {
  const [org] = await db
    .insert(tradingOrganizations)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return org;
}

export async function getTradingOrganizationsByUser(userId: string) {
  return db
    .select()
    .from(tradingOrganizations)
    .where(eq(tradingOrganizations.userId, userId))
    .orderBy(desc(tradingOrganizations.createdAt));
}

export async function getTradingOrganization(organizationId: string) {
  const [org] = await db
    .select()
    .from(tradingOrganizations)
    .where(eq(tradingOrganizations.organizationId, organizationId));
  return org;
}

// ============================================================================
// Trading Wallets
// ============================================================================

export async function createTradingWallet(data: {
  walletId: string;
  walletName: string;
  organizationId: string;
}) {
  const [wallet] = await db
    .insert(tradingWallets)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return wallet;
}

export async function getTradingWalletsByOrganization(organizationId: string) {
  return db
    .select()
    .from(tradingWallets)
    .where(eq(tradingWallets.organizationId, organizationId))
    .orderBy(desc(tradingWallets.createdAt));
}

// ============================================================================
// Trading Wallet Accounts
// ============================================================================

export async function createTradingWalletAccount(data: {
  walletAccountId: string;
  walletAccountName: string;
  walletId: string;
  publicKey: string;
  stacksAddress?: string | null;
}) {
  const [account] = await db
    .insert(tradingWalletAccounts)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return account;
}

export async function getTradingWalletAccountsByWallet(walletId: string) {
  return db
    .select()
    .from(tradingWalletAccounts)
    .where(eq(tradingWalletAccounts.walletId, walletId))
    .orderBy(desc(tradingWalletAccounts.createdAt));
}

export async function getTradingWalletAccount(walletAccountId: string) {
  const [account] = await db
    .select()
    .from(tradingWalletAccounts)
    .where(eq(tradingWalletAccounts.walletAccountId, walletAccountId));
  return account;
}

export async function updateStacksAddress(
  walletAccountId: string,
  stacksAddress: string
) {
  const [account] = await db
    .update(tradingWalletAccounts)
    .set({ stacksAddress, updatedAt: new Date() })
    .where(eq(tradingWalletAccounts.walletAccountId, walletAccountId))
    .returning();
  return account;
}

// ============================================================================
// Complex Queries with Joins
// ============================================================================

export async function getFullTradingOrganizationData(userId: string) {
  const orgs = await getTradingOrganizationsByUser(userId);

  const result = await Promise.all(
    orgs.map(async (org) => {
      const wallets = await getTradingWalletsByOrganization(org.organizationId);

      const walletsWithAccounts = await Promise.all(
        wallets.map(async (wallet) => {
          const accounts = await getTradingWalletAccountsByWallet(wallet.walletId);
          return {
            ...wallet,
            accounts,
          };
        })
      );

      return {
        ...org,
        wallets: walletsWithAccounts,
      };
    })
  );

  return result;
}
