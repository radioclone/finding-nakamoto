import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";
import { db } from "@/lib/db";
import {
  tradingOrganizations,
  tradingWallets,
  tradingWalletAccounts,
} from "@/lib/db/schema";

const BASE_URL = process.env.TURNKEY_BASE_URL;
const PARENT_API_PUBLIC_KEY = process.env.TURNKEY_API_PUBLIC_KEY;
const PARENT_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY;
const PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * Fetch Sub-Organizations Cron Job
 *
 * This route fetches all sub-organizations from Turnkey and caches them in the database
 * for fast offchain queries.
 *
 * IMPORTANT: This is an offchain caching solution for performance optimization.
 * - Use this endpoint when you need fast queries without hitting Turnkey API repeatedly
 * - For 100% real-time data directly from Turnkey, use /api/turnkey/get-trading-orgs
 *
 * When to use:
 * - Offchain (cached): This endpoint - best for dashboards, analytics, frequent queries
 * - Onchain (direct): /api/turnkey/get-trading-orgs - best for real-time accuracy, admin operations
 *
 * See docs/turnkey_stacks.md for more details on the architecture.
 */
export const revalidate = 0;
export async function GET(req: NextRequest) {
  try {
    // Authorization check
    console.log("Authorization check");
    if (isProd()) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    if (
      !BASE_URL ||
      !PARENT_API_PUBLIC_KEY ||
      !PARENT_API_PRIVATE_KEY ||
      !PARENT_ORGANIZATION_ID
    ) {
      return NextResponse.json(
        { error: "Missing Turnkey configuration" },
        { status: 500 }
      );
    }

    const parentClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: PARENT_API_PRIVATE_KEY,
      apiPublicKey: PARENT_API_PUBLIC_KEY,
      defaultOrganizationId: PARENT_ORGANIZATION_ID,
    }).apiClient();

    // Fetch all sub-organization IDs
    const subOrgIdsResponse = await parentClient.getSubOrgIds({
      organizationId: PARENT_ORGANIZATION_ID,
    });

    const subOrgIds =
      (subOrgIdsResponse as { subOrganizationIds?: string[]; organizationIds?: string[] })
        .subOrganizationIds ?? subOrgIdsResponse.organizationIds ?? [];

    const organizationsData = [];
    let syncedOrgs = 0;
    let syncedWallets = 0;
    let syncedAccounts = 0;

    // Fetch details for each sub-organization
    for (const subOrganizationId of subOrgIds) {
      if (!subOrganizationId) continue;

      try {
        // Fetch organization details and wallets in parallel
        const [organizationResponse, walletsResponse] = await Promise.all([
          parentClient.getOrganization({ organizationId: subOrganizationId }),
          parentClient
            .getWallets({ organizationId: subOrganizationId })
            .catch((walletError) => {
              console.error(
                `Failed to fetch wallets for ${subOrganizationId}:`,
                walletError
              );
              return null;
            }),
        ]);

        // Extract organization name
        const organizationName =
          organizationResponse.organizationData?.name ??
          (organizationResponse as { organization?: { organizationName?: string } })
            .organization?.organizationName ??
          "";

        // Extract userId from organization name (pattern: trading-org-{userId}_{timestamp})
        const userIdMatch = organizationName.match(/trading-org-([a-f0-9-]+)_/);
        const userId = userIdMatch?.[1] ?? "";

        // Save organization to database
        if (userId) {
          await db
            .insert(tradingOrganizations)
            .values({
              organizationId: subOrganizationId,
              organizationName,
              userId,
            })
            .onConflictDoUpdate({
              target: tradingOrganizations.organizationId,
              set: {
                organizationName,
                userId,
                updatedAt: new Date(),
              },
            });
          syncedOrgs++;
        }

        // Fetch wallet accounts for each wallet
        const walletsWithAccounts = [];
        if (walletsResponse?.wallets) {
          for (const wallet of walletsResponse.wallets) {
            const walletId = wallet.walletId ?? "";
            const walletName = wallet.walletName ?? "";

            if (!walletId) {
              walletsWithAccounts.push({
                ...wallet,
                accounts: [],
              });
              continue;
            }

            // Save wallet to database
            if (userId) {
              await db
                .insert(tradingWallets)
                .values({
                  walletId,
                  walletName,
                  organizationId: subOrganizationId,
                })
                .onConflictDoUpdate({
                  target: tradingWallets.walletId,
                  set: {
                    walletName,
                    organizationId: subOrganizationId,
                    updatedAt: new Date(),
                  },
                });
              syncedWallets++;
            }

            try {
              const accountsResponse = await parentClient.getWalletAccounts({
                organizationId: subOrganizationId,
                walletId,
              });

              const accounts = (accountsResponse.accounts ?? []).map((account) => ({
                walletAccountId: account.walletAccountId ?? "",
                walletAccountName: account.path ?? account.walletAccountId ?? "",
                publicKey: typeof account.publicKey === "string" ? account.publicKey : "",
              }));

              // Save accounts to database
              for (const account of accounts) {
                if (userId && account.walletAccountId && account.publicKey) {
                  await db
                    .insert(tradingWalletAccounts)
                    .values({
                      walletAccountId: account.walletAccountId,
                      walletAccountName: account.walletAccountName,
                      walletId,
                      publicKey: account.publicKey,
                    })
                    .onConflictDoUpdate({
                      target: tradingWalletAccounts.walletAccountId,
                      set: {
                        walletAccountName: account.walletAccountName,
                        walletId,
                        publicKey: account.publicKey,
                        updatedAt: new Date(),
                      },
                    });
                  syncedAccounts++;
                }
              }

              walletsWithAccounts.push({
                ...wallet,
                accounts,
              });
            } catch (accountError) {
              console.error(
                `Failed to fetch accounts for wallet ${walletId}:`,
                accountError
              );
              walletsWithAccounts.push({
                ...wallet,
                accounts: [],
                error: accountError instanceof Error ? accountError.message : String(accountError),
              });
            }
          }
        }

        organizationsData.push({
          organizationId: subOrganizationId,
          organizationName,
          wallets: walletsWithAccounts,
        });
      } catch (orgError) {
        console.error(
          `Failed to process organization ${subOrganizationId}:`,
          orgError
        );
        organizationsData.push({
          organizationId: subOrganizationId,
          error:
            orgError instanceof Error ? orgError.message : String(orgError),
        });
      }
    }
    console.log("Finished processing sub-organizations");

    return NextResponse.json({
      success: true,
      totalSubOrgs: subOrgIds.length,
      stats: {
        organizations: syncedOrgs,
        wallets: syncedWallets,
        accounts: syncedAccounts,
      },
      organizationsData,
    });
  } catch (error) {
    console.error("Failed to fetch sub-organizations:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to fetch sub-organizations",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch sub-organizations" },
      { status: 500 }
    );
  }
}
