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
const DEFAULT_PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;
const DEFAULT_RECIPIENT =
  process.env.NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

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

type SignTradingRequest = {
  organizationId?: string;
  walletId?: string;
  walletAccountId?: string;
  publicKey?: string;
  recipient?: string;
  amount?: string | number;
  fee?: string | number;
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

    const body = (await request.json()) as SignTradingRequest;

    const organizationId =
      typeof body.organizationId === "string" && body.organizationId.trim().length > 0
        ? body.organizationId.trim()
        : DEFAULT_PARENT_ORGANIZATION_ID;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const walletAccountId =
      typeof body.walletAccountId === "string" && body.walletAccountId.trim().length > 0
        ? body.walletAccountId.trim()
        : undefined;

    const publicKeyInput =
      typeof body.publicKey === "string" && body.publicKey.trim().length > 0
        ? body.publicKey.trim()
        : undefined;

    if (!publicKeyInput) {
      return NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
    }

    if (!walletAccountId) {
      return NextResponse.json(
        { error: "walletAccountId is required for delegated signing" },
        { status: 400 }
      );
    }

    const normalizedPublicKey = publicKeyInput.startsWith("0x")
      ? publicKeyInput.slice(2)
      : publicKeyInput;

    const network: "testnet" | "mainnet" =
      body.network === "mainnet" ? "mainnet" : "testnet";

    const recipient =
      typeof body.recipient === "string" && body.recipient.trim().length > 0
        ? body.recipient.trim()
        : DEFAULT_RECIPIENT;

    const amount =
      body.amount !== undefined
        ? BigInt(typeof body.amount === "string" ? body.amount : Math.floor(body.amount))
        : BigInt(10_000);

    const fee =
      body.fee !== undefined
        ? BigInt(typeof body.fee === "string" ? body.fee : Math.floor(body.fee))
        : BigInt(10_000);

    const stacksAddress = await getAddressFromPublicKey(normalizedPublicKey, network);

    if (!stacksAddress) {
      return NextResponse.json(
        { error: "Unable to derive Stacks address from public key" },
        { status: 500 }
      );
    }

    const nonce = body.nonce !== undefined ? BigInt(body.nonce) : undefined;
    const { stacksTransaction, stacksTxSigner } = await constructStacksTx(
      normalizedPublicKey,
      recipient,
      amount,
      fee,
      network,
      nonce
    );

    const preSignSigHash = generatePreSignSigHash(stacksTransaction, stacksTxSigner);
    const payload = `0x${preSignSigHash}`;

    const delegatedClient = new Turnkey({
      apiBaseUrl: BASE_URL,
      apiPrivateKey: DELEGATED_PRIVATE_KEY,
      apiPublicKey: DELEGATED_PUBLIC_KEY,
      defaultOrganizationId: organizationId,
    }).apiClient();

    const signature = await delegatedClient.signRawPayload({
      organizationId,
      payload,
      signWith: publicKeyInput,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });

    const formattedSignature = `${signature.v}${signature.r.padStart(64, "0")}${signature.s.padStart(64, "0")}`;

    const spendingCondition =
      stacksTransaction.auth.spendingCondition as SingleSigSpendingCondition;
    spendingCondition.signature = createMessageSignature(formattedSignature);

    let broadcastResult: unknown = null;
    if (body.broadcast !== false) {
      broadcastResult = await broadcastTransaction({
        transaction: stacksTransaction,
        network,
      });
    }

    const serializedTransaction =
      typeof stacksTransaction.serialize === "function"
        ? Buffer.from(stacksTransaction.serialize()).toString("hex")
        : undefined;

    return NextResponse.json({
      success: true,
      organizationId,
      walletAccountId,
      stacksAddress,
      transactionHex: serializedTransaction,
      signature: formattedSignature,
      broadcastResult,
    });
  } catch (error) {
    console.error("Trading test transfer failed:", error);

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
