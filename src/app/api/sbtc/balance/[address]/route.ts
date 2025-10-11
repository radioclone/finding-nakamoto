import { NextRequest, NextResponse } from 'next/server';
import { getRandomHiroHeader } from '@/lib/hiro-api-helpers';

interface FungibleToken {
  balance: string;
  total_sent: string;
  total_received: string;
}

interface HiroBalancesResponse {
  stx: {
    balance: string;
    total_sent: string;
    total_received: string;
    total_fees_sent: string;
  };
  fungible_tokens: {
    [key: string]: FungibleToken;
  };
  non_fungible_tokens: Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: { type: 'invalid_request_error', message: 'Address is required' } },
        { status: 400 }
      );
    }

    // Fetch balances from Hiro API
    const hiroResponse = await fetch(
      `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`,
      {
        headers: getRandomHiroHeader()
      }
    );

    if (!hiroResponse.ok) {
      throw new Error(`Hiro API error: ${hiroResponse.status}`);
    }

    const data: HiroBalancesResponse = await hiroResponse.json();

    // Extract STX balance
    const stxBalance = parseInt(data.stx.balance);
    // Convert from micro-STX to STX (divide by 1,000,000 - 6 decimals)
    const stxAmount = stxBalance / 1_000_000;

    // Extract sBTC balance from fungible tokens
    const sbtcAssetId = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token::sbtc-token';
    const sbtcToken = data.fungible_tokens[sbtcAssetId];

    const sbtcBalance = sbtcToken ? parseInt(sbtcToken.balance) : 0;

    // Convert from microsBTC to sBTC (divide by 100,000,000)
    const sbtcAmount = sbtcBalance / 100_000_000;

    return NextResponse.json({
      address,
      stx_balance: stxBalance, // Raw micro-STX amount
      stx_amount: stxAmount, // Human readable STX amount
      formatted_stx: `${stxAmount.toFixed(6)} STX`,
      sbtc_balance: sbtcBalance, // Raw microsBTC amount
      sbtc_amount: sbtcAmount, // Human readable sBTC amount
      formatted_balance: `${sbtcAmount.toFixed(8)} sBTC`,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: { type: 'api_error', message: 'Failed to fetch balance' } },
      { status: 500 }
    );
  }
}
