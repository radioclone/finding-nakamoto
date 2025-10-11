import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  tradingOrganizations,
  tradingWallets,
  tradingWalletAccounts,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const revalidate = 0;

type GetTradingWalletsRequestBody = {
  userId?: string;
};

/**
 * Get Trading Wallets from Database
 *
 * This route fetches trading wallets and their accounts from the database cache
 * for a given userId. The data should be pre-populated by the /api/cron/fetchSubOrgs endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GetTradingWalletsRequestBody | null;
    const userId =
      typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch organizations for this user
    const organizations = await db
      .select()
      .from(tradingOrganizations)
      .where(eq(tradingOrganizations.userId, userId));

    if (organizations.length === 0) {
      return NextResponse.json({
        success: true,
        tradingWallets: [],
      });
    }

    // Build response with wallets and accounts
    const result = await Promise.all(
      organizations.map(async (org) => {
        // Fetch wallets for this organization
        const orgWallets = await db
          .select()
          .from(tradingWallets)
          .where(eq(tradingWallets.organizationId, org.organizationId));

        // Fetch accounts for each wallet
        const walletsWithAccounts = await Promise.all(
          orgWallets.map(async (wallet) => {
            const accounts = await db
              .select()
              .from(tradingWalletAccounts)
              .where(eq(tradingWalletAccounts.walletId, wallet.walletId));

            return {
              walletId: wallet.walletId,
              walletName: wallet.walletName,
              createdAt: {
                seconds: String(Math.floor(wallet.createdAt.getTime() / 1000)),
                nanos: "0",
              },
              updatedAt: {
                seconds: String(Math.floor(wallet.updatedAt.getTime() / 1000)),
                nanos: "0",
              },
              exported: false,
              imported: false,
              accounts: accounts.map((account) => ({
                walletAccountId: account.walletAccountId,
                walletAccountName: account.walletAccountName,
                publicKey: account.publicKey,
              })),
            };
          })
        );

        return {
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          walletInfo: walletsWithAccounts,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tradingWallets: result,
    });
  } catch (error) {
    console.error("Failed to fetch trading wallets:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to fetch trading wallets",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch trading wallets" },
      { status: 500 }
    );
  }
}
