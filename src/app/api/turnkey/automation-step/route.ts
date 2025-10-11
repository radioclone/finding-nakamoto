import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tradingWalletAccounts, tradingWallets, tradingOrganizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAddressFromPublicKey } from "@stacks/transactions";
import { getRandomHiroHeader } from "@/lib/hiro-api-helpers";

// Fixed exchange rate: 1 STX = 500 satoshis = 0.00000500 sBTC
const FIXED_EXCHANGE_RATE = 500; // satoshis per STX
const STEP_DELAY_MS = 3000; // 3 seconds delay between steps to prevent nonce conflicts

interface NonceResponse {
  possible_next_nonce: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchNonce(address: string, network: string): Promise<number> {
  const baseUrl = network === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";
  const url = `${baseUrl}/extended/v1/address/${address}/nonces`;

  const response = await fetch(url, {
    headers: getRandomHiroHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch nonce: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as NonceResponse;
  console.log(`[nonce] Response:`, data);

  return data.possible_next_nonce;
}

type AutomationStep = "swap_stx_to_sbtc" | "swap_sbtc_to_stx" | "transfer_stx";

async function getAccountDetails(walletAccountId: string) {
  const accountResults = await db
    .select()
    .from(tradingWalletAccounts)
    .where(eq(tradingWalletAccounts.walletAccountId, walletAccountId))
    .limit(1);

  const accountResult = accountResults[0];

  if (!accountResult || !accountResult.publicKey) {
    throw new Error("Wallet account not found or missing public key");
  }

  // Derive Stacks address from public key
  const stacksAddress = getAddressFromPublicKey(accountResult.publicKey, "testnet");

  const walletResults = await db
    .select()
    .from(tradingWallets)
    .where(eq(tradingWallets.walletId, accountResult.walletId))
    .limit(1);

  const walletResult = walletResults[0];

  if (!walletResult) {
    throw new Error("Wallet not found");
  }

  const orgResults = await db
    .select()
    .from(tradingOrganizations)
    .where(eq(tradingOrganizations.organizationId, walletResult.organizationId))
    .limit(1);

  const orgResult = orgResults[0];

  if (!orgResult) {
    throw new Error("Organization not found");
  }

  return {
    account: accountResult,
    wallet: walletResult,
    organization: orgResult,
    stacksAddress,
  };
}

async function executeSwapStxToSbtc(
  organizationId: string,
  walletId: string,
  walletAccountId: string,
  publicKey: string,
  amountBaseUnit: string,
  stacksAddress: string
) {
  const endpoint = "/api/stacks/swap-stx-to-sbtc";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5002";

  // Fetch nonce before transaction
  const nonce = await fetchNonce(stacksAddress, "testnet");

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId,
      walletId,
      walletAccountId,
      publicKey,
      stxAmount: amountBaseUnit,
      network: "testnet",
      broadcast: true,
      nonce,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.error ?? "Swap STX to sBTC failed");
  }

  return {
    txId: result?.broadcastResult?.txid,
    message: "Successfully swapped STX to sBTC",
  };
}

async function executeSwapSbtcToStx(
  organizationId: string,
  walletId: string,
  walletAccountId: string,
  publicKey: string,
  sbtcAmount: string,
  stacksAddress: string
) {
  const endpoint = "/api/stacks/swap-sbtc-to-stx";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Calculate sBTC amount from original STX amount
  // 1 STX = 500 satoshis
  const stxAmountMicro = BigInt(sbtcAmount);
  const stxAmount = stxAmountMicro / BigInt(1_000_000); // Convert to STX
  const sbtcSatoshis = stxAmount * BigInt(FIXED_EXCHANGE_RATE);

  // Fetch nonce before transaction
  const nonce = await fetchNonce(stacksAddress, "testnet");

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId,
      walletId,
      walletAccountId,
      publicKey,
      sbtcAmount: sbtcSatoshis.toString(),
      network: "testnet",
      broadcast: true,
      nonce,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.error ?? "Swap sBTC to STX failed");
  }

  return {
    txId: result?.broadcastResult?.txid,
    message: "Successfully swapped sBTC back to STX",
  };
}

async function executeTransferStx(
  organizationId: string,
  walletId: string,
  walletAccountId: string,
  publicKey: string,
  destinationAddress: string,
  amountBaseUnit: string,
  stacksAddress: string
) {
  const endpoint = "/api/stacks/send-stx";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Fetch nonce before transaction
  const nonce = await fetchNonce(stacksAddress, "testnet");

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId,
      walletId,
      walletAccountId,
      publicKey,
      recipientAddress: destinationAddress,
      amountMicroStx: amountBaseUnit,
      network: "testnet",
      broadcast: true,
      nonce,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.error ?? "Transfer STX failed");
  }

  return {
    txId: result?.broadcastResult?.txid,
    message: `Successfully transferred STX to ${destinationAddress}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAccountId, step, amountBaseUnit, destinationAddress } = body;

    if (!walletAccountId || !step || !amountBaseUnit) {
      return NextResponse.json(
        { error: "walletAccountId, step, and amountBaseUnit are required" },
        { status: 400 }
      );
    }

    // Get account details
    const { account, wallet, organization, stacksAddress } = await getAccountDetails(walletAccountId);

    let result;

    switch (step as AutomationStep) {
      case "swap_stx_to_sbtc":
        // Wait before executing to prevent nonce conflicts
        await delay(STEP_DELAY_MS);
        result = await executeSwapStxToSbtc(
          organization.organizationId,
          wallet.walletId,
          account.walletAccountId,
          account.publicKey,
          amountBaseUnit,
          stacksAddress
        );
        break;

      case "swap_sbtc_to_stx":
        // Wait before executing to prevent nonce conflicts
        await delay(STEP_DELAY_MS);
        result = await executeSwapSbtcToStx(
          organization.organizationId,
          wallet.walletId,
          account.walletAccountId,
          account.publicKey,
          amountBaseUnit,
          stacksAddress
        );
        break;

      case "transfer_stx":
        if (!destinationAddress) {
          throw new Error("Destination address is required for transfer step");
        }
        // Wait before executing to prevent nonce conflicts
        await delay(STEP_DELAY_MS);
        result = await executeTransferStx(
          organization.organizationId,
          wallet.walletId,
          account.walletAccountId,
          account.publicKey,
          destinationAddress,
          amountBaseUnit,
          stacksAddress
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown step: ${step}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Automation step failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
