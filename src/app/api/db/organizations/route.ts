import { NextRequest, NextResponse } from "next/server";
import {
  getFullTradingOrganizationData,
  syncTradingOrganization,
} from "@/lib/db/helpers";

// GET /api/db/organizations?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const organizations = await getFullTradingOrganizationData(userId);

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch organizations",
      },
      { status: 500 }
    );
  }
}

// POST /api/db/organizations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, organizationId, organizationName, wallets } = body;

    if (!userId || !organizationId || !organizationName) {
      return NextResponse.json(
        { error: "userId, organizationId, and organizationName are required" },
        { status: 400 }
      );
    }

    const organization = await syncTradingOrganization({
      userId,
      organizationId,
      organizationName,
      wallets: wallets || [],
    });

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error("Error syncing organization:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync organization",
      },
      { status: 500 }
    );
  }
}
