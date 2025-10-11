import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";

export const revalidate = 0;

type GetWalletsRequestBody = {
  organizationId?: string;
};

const BASE_URL = process.env.TURNKEY_BASE_URL;
const PARENT_API_PUBLIC_KEY = process.env.TURNKEY_API_PUBLIC_KEY;
const PARENT_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY;
const PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;

/**
 * Get Wallets
 *
 * This route fetches all wallets from a specified organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GetWalletsRequestBody | null;
    const organizationId =
      typeof body?.organizationId === "string"
        ? body.organizationId.trim()
        : "";

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

    const parentClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: PARENT_API_PRIVATE_KEY,
      apiPublicKey: PARENT_API_PUBLIC_KEY,
      defaultOrganizationId: PARENT_ORGANIZATION_ID,
    }).apiClient();


    // Fetch wallets from the specified organization
    const walletsResponse = await parentClient.getWallets({
      organizationId,
    });

    return NextResponse.json({
      success: true,
      wallets: walletsResponse.wallets ?? [],
    });
  } catch (error) {
    console.error("Failed to fetch wallets:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to fetch wallets", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}
