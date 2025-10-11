import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";

export const revalidate = 0;

type GetTradingOrgsRequestBody = {
  tradingOrgPrefix?: string;
};

const BASE_URL = process.env.TURNKEY_BASE_URL;
const PARENT_API_PUBLIC_KEY = process.env.TURNKEY_API_PUBLIC_KEY;
const PARENT_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY;
const PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;

/**
 * Get Trading Organizations
 *
 * This route fetches trading sub-organizations that match a given prefix.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GetTradingOrgsRequestBody | null;
    const tradingOrgPrefix =
      typeof body?.tradingOrgPrefix === "string"
        ? body.tradingOrgPrefix.trim()
        : "";

    if (!tradingOrgPrefix) {
      return NextResponse.json(
        { error: "tradingOrgPrefix is required" },
        { status: 400 }
      );
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

    const subOrgIdsResponse = await parentClient.getSubOrgIds({
      organizationId: PARENT_ORGANIZATION_ID,
    });

    const subOrgIds =
      (subOrgIdsResponse as { subOrganizationIds?: string[]; organizationIds?: string[] })
        .subOrganizationIds ?? subOrgIdsResponse.organizationIds ?? [];

    const subOrganizations = await Promise.all(
      subOrgIds.map(async (subOrganizationId) => {
        if (!subOrganizationId) {
          return null;
        }

        try {
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

          const organizationName =
            organizationResponse.organizationData?.name ??
            (organizationResponse as { organization?: { organizationName?: string } })
              .organization?.organizationName ??
            "";

          const wallets = await Promise.all(
            (walletsResponse?.wallets ?? []).map(async (wallet) => {
              const walletId = wallet.walletId ?? "";

              if (!walletId) {
                return {
                  walletId: "",
                  walletName: wallet.walletName ?? "",
                  accounts: [],
                };
              }

              try {
                const accountsResponse = await parentClient.getWalletAccounts({
                  organizationId: subOrganizationId,
                  walletId,
                });

                const accounts = (accountsResponse.accounts ?? []).map(
                  (account) => ({
                    walletAccountId: account.walletAccountId ?? "",
                    walletAccountName: account.path ?? account.walletAccountId ?? "",
                    publicKey:
                      typeof account.publicKey === "string" ? account.publicKey : "",
                  })
                );

                return {
                  walletId,
                  walletName: wallet.walletName ?? "",
                  accounts,
                };
              } catch (walletAccountsError) {
                console.error(
                  `Failed to fetch wallet accounts for ${walletId}:`,
                  walletAccountsError
                );

                return {
                  walletId,
                  walletName: wallet.walletName ?? "",
                  accounts: [],
                };
              }
            })
          );

          return {
            organizationId: subOrganizationId,
            organizationName,
            wallets,
          };
        } catch (error) {
          console.error(`Failed to load sub-organization ${subOrganizationId}:`, error);
          return {
            organizationId: subOrganizationId,
            organizationName: "",
            wallets: [],
          };
        }
      })
    );

    const tradingOrgs = subOrganizations
      .filter((org): org is NonNullable<typeof org> => org !== null)
      .filter((org) => org.organizationName.startsWith(tradingOrgPrefix));

    return NextResponse.json({
      success: true,
      tradingOrgs,
    });
  } catch (error) {
    console.error("Failed to fetch trading organizations:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to fetch trading organizations",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch trading organizations" },
      { status: 500 }
    );
  }
}
