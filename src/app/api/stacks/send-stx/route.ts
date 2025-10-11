import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";
import {
  broadcastTransaction,
  createMessageSignature,
  getAddressFromPublicKey,
  makeUnsignedSTXTokenTransfer,
  sigHashPreSign,
  SingleSigSpendingCondition,
  TransactionSigner,
  type StacksTransactionWire,
} from "@stacks/transactions";

const BASE_URL = process.env.TURNKEY_BASE_URL;
const DELEGATED_PUBLIC_KEY = process.env.TURNKEY_DELEGATED_API_PUBLIC_KEY;
const DELEGATED_PRIVATE_KEY = process.env.TURNKEY_DELEGATED_API_PRIVATE_KEY;

const constructStacksTx = async (
  publicKey: string,
  recipient: string,
  amount: bigint,
  fee: bigint,
  network: "mainnet" | "testnet",
  nonce?: bigint
) => {
  const txOptions: any = {
    recipient,
    amount,
    publicKey,
    fee,
    network,
  };

  if (nonce !== undefined) {
    txOptions.nonce = nonce;
  }

  const transaction = await makeUnsignedSTXTokenTransfer(txOptions);

  const signer = new TransactionSigner(transaction);
  return { stacksTransaction: transaction, stacksTxSigner: signer };
};

const generatePreSignSigHash = (
  transaction: StacksTransactionWire,
  signer: TransactionSigner
) =>
  sigHashPreSign(
    signer.sigHash,
    transaction.auth.authType,
    transaction.auth.spendingCondition.fee,
    transaction.auth.spendingCondition.nonce
  );

type SendStxRequest = {
  organizationId: string;
  walletId: string;
  walletAccountId: string;
  publicKey: string;
  recipientAddress: string;
  amountMicroStx: string;
  network?: "testnet" | "mainnet";
  broadcast?: boolean;
  nonce?: number;
};

export async function POST(request: NextRequest) {
  try {
    if (!BASE_URL) {
      return NextResponse.json(
        { error: "TURNKEY_BASE_URL is not configured" },
        { status: 500 }
      );
    }

    if (!DELEGATED_PUBLIC_KEY || !DELEGATED_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Delegated API credentials not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SendStxRequest;

    // Validate required fields
    if (!body.organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (!body.walletAccountId) {
      return NextResponse.json(
        { error: "walletAccountId is required" },
        { status: 400 }
      );
    }

    if (!body.publicKey) {
      return NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
    }

    if (!body.recipientAddress) {
      return NextResponse.json(
        { error: "recipientAddress is required" },
        { status: 400 }
      );
    }

    if (!body.amountMicroStx) {
      return NextResponse.json(
        { error: "amountMicroStx is required" },
        { status: 400 }
      );
    }

    const normalizedPublicKey = body.publicKey.startsWith("0x")
      ? body.publicKey.slice(2)
      : body.publicKey;

    const network: "testnet" | "mainnet" =
      body.network === "mainnet" ? "mainnet" : "testnet";

    const amount = BigInt(body.amountMicroStx);
    const fee = BigInt(10_000); // Default fee

    // Derive Stacks address from public key
    const stacksAddress = await getAddressFromPublicKey(normalizedPublicKey, network);

    if (!stacksAddress) {
      return NextResponse.json(
        { error: "Unable to derive Stacks address from public key" },
        { status: 500 }
      );
    }

    // Construct the transaction
    const nonce = body.nonce !== undefined ? BigInt(body.nonce) : undefined;
    const { stacksTransaction, stacksTxSigner } = await constructStacksTx(
      normalizedPublicKey,
      body.recipientAddress,
      amount,
      fee,
      network,
      nonce
    );

    // Generate pre-sign sig hash
    const preSignSigHash = generatePreSignSigHash(stacksTransaction, stacksTxSigner);
    const payload = `0x${preSignSigHash}`;

    // Initialize Turnkey client with delegated credentials
    const delegatedClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: DELEGATED_PRIVATE_KEY,
      apiPublicKey: DELEGATED_PUBLIC_KEY,
      defaultOrganizationId: body.organizationId,
    }).apiClient();

    // Sign the transaction
    const signature = await delegatedClient.signRawPayload({
      organizationId: body.organizationId,
      payload,
      signWith: body.publicKey,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });

    const formattedSignature = `${signature.v}${signature.r.padStart(64, "0")}${signature.s.padStart(64, "0")}`;

    // Attach signature to transaction
    const spendingCondition =
      stacksTransaction.auth.spendingCondition as SingleSigSpendingCondition;
    spendingCondition.signature = createMessageSignature(formattedSignature);

    // Broadcast transaction if requested
    let broadcastResult: unknown = null;
    if (body.broadcast !== false) {
      broadcastResult = await broadcastTransaction({
        transaction: stacksTransaction,
        network,
      });

      // Check if broadcast failed
      if (broadcastResult && typeof broadcastResult === 'object' && 'error' in broadcastResult) {
        const result = broadcastResult as any;
        let errorMessage = `Transaction ${result.error}`;

        if ('reason' in result && result.reason) {
          errorMessage += `: ${result.reason}`;

          // Add reason data if available (e.g., for NotEnoughFunds)
          if ('reason_data' in result && result.reason_data) {
            const data = result.reason_data as any;
            if (data.actual !== undefined && data.expected !== undefined) {
              const actualAmount = parseInt(data.actual, 16);
              const expectedAmount = parseInt(data.expected, 16);
              errorMessage += ` (have ${actualAmount} µSTX, need ${expectedAmount} µSTX)`;
            }
          }
        }

        if ('txid' in result && result.txid) {
          errorMessage += ` (txid: ${result.txid})`;
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            broadcastResult: result
          },
          { status: 400 }
        );
      }
    }

    const serializedTransaction =
      typeof stacksTransaction.serialize === "function"
        ? Buffer.from(stacksTransaction.serialize()).toString("hex")
        : undefined;

    return NextResponse.json({
      success: true,
      organizationId: body.organizationId,
      walletAccountId: body.walletAccountId,
      stacksAddress,
      recipientAddress: body.recipientAddress,
      amountMicroStx: body.amountMicroStx,
      transactionHex: serializedTransaction,
      signature: formattedSignature,
      broadcastResult,
    });
  } catch (error) {
    console.error("STX transfer failed:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}
