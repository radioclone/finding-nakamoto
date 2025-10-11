import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";

export const revalidate = 0;
type GrantAccessRequestBody = {
  userId?: string;
  organizationId?: string;
  user?: {
    userId: string;
    userName?: string;
    userTags?: string[];
  };
};

const BASE_URL = process.env.TURNKEY_BASE_URL;
const DELEGATED_PUBLIC_KEY = process.env.TURNKEY_DELEGATED_API_PUBLIC_KEY;
const DELEGATED_PRIVATE_KEY = process.env.TURNKEY_DELEGATED_API_PRIVATE_KEY;
const DELEGATE_USER_ID = process.env.DELEGATE_USER_ID;
const PARENT_API_PUBLIC_KEY = process.env.TURNKEY_API_PUBLIC_KEY;
const PARENT_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY;
const PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;
const DELEGATED_POLICY_NAME =
  process.env.TURNKEY_DELEGATED_POLICY_NAME ?? "Delegated Operator Policy";
const TRADING_WALLET_NAME =
  process.env.TURNKEY_TRADING_WALLET_NAME ?? "Trading Wallet";
const STACKS_ACCOUNT_PARAMS = {
  curve: "CURVE_SECP256K1" as const,
  pathFormat: "PATH_FORMAT_BIP32" as const,
  path: "m/44'/5757'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_COMPRESSED" as const,
};

/**
 * Grant Access
 *
 * This route creates a NEW sub-organization with:
 * - The delegate user (with API credentials)
 * - The current user (authenticated user)
 *
 * This sub-org will be used for creating wallets, ensuring the delegate
 * user has access to sign transactions from the start.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GrantAccessRequestBody | null;
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const organizationId =
      typeof body?.organizationId === "string"
        ? body.organizationId.trim()
        : "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
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

    if (!DELEGATED_PUBLIC_KEY || !DELEGATED_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Delegated API credentials not configured" },
        { status: 500 }
      );
    }

    const parentClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: PARENT_API_PRIVATE_KEY,
      apiPublicKey: PARENT_API_PUBLIC_KEY,
      defaultOrganizationId: PARENT_ORGANIZATION_ID,
    }).apiClient();

    // const testParentClient = await parentClient.getOrganization({
    //   organizationId: PARENT_ORGANIZATION_ID,
    // });

      // Get current user's organization
    const currentUserOrg = await parentClient.getOrganization({
      organizationId: organizationId,
    });
      if (!currentUserOrg?.organizationData) {
      return NextResponse.json(
        { error: "Current user organization not found" },
        { status: 404 }
      );
    }

    // TEST 

    const orgs = await parentClient.getOrganization({
      organizationId: PARENT_ORGANIZATION_ID,
    });

    // Find the current user in the organization by userId
    const currentUser = currentUserOrg.organizationData.users?.find(
      (user) => user.userId === userId
    );

    if (!currentUser) {
      return NextResponse.json(
        { error: `User ${userId} not found in the organization` },
        { status: 404 }
      );
    }

    // Validate user payload coming from the authenticated frontend session
    // const requestUser = body?.user;

    // if (!requestUser || requestUser.userId !== userId) {
    //   return NextResponse.json(
    //     { error: "User payload is required and must match userId" },
    //     { status: 400 }
    //   );
    // }

    const rootUsers = [
      {
        userName: process.env.TURNKEY_DELEGATED_USER_NAME ?? "Delegated Operator",
        userTags: [],
        apiKeys: [
          {
            apiKeyName:
              process.env.TURNKEY_DELEGATED_API_KEY_NAME ?? "Delegated API Key",
            publicKey: DELEGATED_PUBLIC_KEY,
            curveType: "API_KEY_CURVE_P256" as const,
          },
        ],
        authenticators: [],
        oauthProviders: [],
      },
      {
        userName: currentUser.userName,
        userEmail: currentUser.userEmail || `${currentUser.userName}@temp.com`, // for passkey 
        apiKeys: [],
        authenticators: [],
        oauthProviders: [],
      },
    ];

    console.log(`Creating sub-org for user ${userId} with delegate access...`);

    const sanitizedUserId = userId.replace(/@/g, "_").replace(/\./g, "_");

    const createSubOrgResponse = await parentClient.createSubOrganization({
      organizationId: PARENT_ORGANIZATION_ID,
      subOrganizationName: `trading-org-${sanitizedUserId}_${Date.now()}`,
      rootUsers,
      rootQuorumThreshold: 1,
    });

    const subOrganizationId = createSubOrgResponse.subOrganizationId;
    const rootUserIds = createSubOrgResponse.rootUserIds ?? [];
    const delegatedUserId = DELEGATE_USER_ID || rootUserIds[0];
    const endUserId = rootUserIds[1];

    console.log(
      `Created sub-org ${subOrganizationId} with delegate user ${delegatedUserId} and end user ${endUserId}`
    );

    const delegatedClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: DELEGATED_PRIVATE_KEY,
      apiPublicKey: DELEGATED_PUBLIC_KEY,
      defaultOrganizationId: subOrganizationId,
    }).apiClient();

    const consensus = `approvers.any(user, user.id == '${delegatedUserId}')`;
    const condition = "true";

    const createPolicyResponse = await delegatedClient.createPolicy({
      policyName: DELEGATED_POLICY_NAME,
      effect: "EFFECT_ALLOW",
      condition,
      consensus,
      notes: "Auto-generated policy for delegated operator to sign with all wallets",
    });

    console.log(
      `Created policy ${createPolicyResponse.policyId} in sub-org ${subOrganizationId}`
    );

    const createWalletResponse = await delegatedClient.createWallet({
      organizationId: subOrganizationId,
      walletName: TRADING_WALLET_NAME,
      accounts: [STACKS_ACCOUNT_PARAMS],
    });

    const walletId = createWalletResponse.walletId;
    const addresses = createWalletResponse.addresses ?? [];

    if (!walletId) {
      throw new Error("Failed to create trading wallet");
    }

    console.log(
      `Created trading wallet ${walletId} in sub-org ${subOrganizationId}`
    );

    const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/fetchSubOrgs`
    fetch(cronUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
    }).catch((error) => {
      console.error("Failed to trigger fetchSubOrgs:", error);
    });

    return NextResponse.json({
      success: true,
      subOrganizationId,
      delegatedUserId,
      endUserId,
      policyId: createPolicyResponse.policyId,
      walletId,
      addresses,
    });
  } catch (error) {
    console.error("Failed to grant delegated access v2:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to grant delegated access", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to grant delegated access" },
      { status: 500 }
    );
  }
}
