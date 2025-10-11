import { NextRequest, NextResponse } from "next/server";
import { Turnkey } from "@turnkey/sdk-server";
import {
  AnchorMode,
  broadcastTransaction,
  ClarityValue,
  createMessageSignature,
  getAddressFromPublicKey,
  makeUnsignedContractCall,
  PostConditionMode,
  sigHashPreSign,
  SingleSigSpendingCondition,
  TransactionSigner,
  type StacksTransactionWire,
  uintCV,
} from "@stacks/transactions";

const BASE_URL = process.env.TURNKEY_BASE_URL;
const DELEGATED_PUBLIC_KEY = process.env.TURNKEY_DELEGATED_API_PUBLIC_KEY;
const DELEGATED_PRIVATE_KEY = process.env.TURNKEY_DELEGATED_API_PRIVATE_KEY;
const DEFAULT_PARENT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID;
const SIMPLE_AMM_CONTRACT_ADDRESS = process.env.SIMPLE_AMM_CONTRACT_ADDRESS;
const SIMPLE_AMM_CONTRACT_NAME = process.env.SIMPLE_AMM_CONTRACT_NAME;

const constructSwapTx = async (
  publicKey: string,
  sbtcAmount: bigint,
  fee: bigint,
  network: "mainnet" | "testnet",
  nonce?: bigint
) => {
  if (!SIMPLE_AMM_CONTRACT_ADDRESS || !SIMPLE_AMM_CONTRACT_NAME) {
    throw new Error("AMM contract configuration is missing");
  }

  // Parse contract address (format: "ADDRESS.CONTRACT_NAME")
  const [contractAddress, contractName] = SIMPLE_AMM_CONTRACT_ADDRESS.split(".");

  if (!contractAddress || !contractName) {
    throw new Error("Invalid AMM contract address format");
  }

  const functionArgs: ClarityValue[] = [
    uintCV(sbtcAmount.toString()),
  ];

  const txOptions: any = {
    contractAddress,
    contractName,
    functionName: "swap-sbtc-to-stx",
    functionArgs,
    publicKey,
    fee,
    network,
    postConditionMode: PostConditionMode.Allow,
  };

  if (nonce !== undefined) {
    txOptions.nonce = nonce;
  }

  const transaction = await makeUnsignedContractCall(txOptions);

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

type SwapRequest = {
  organizationId?: string;
  walletId?: string;
  walletAccountId?: string;
  publicKey?: string;
  sbtcAmount?: string | number;
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

    if (!SIMPLE_AMM_CONTRACT_ADDRESS || !SIMPLE_AMM_CONTRACT_NAME) {
      return NextResponse.json(
        { error: "AMM contract configuration is missing" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SwapRequest;

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

    // Default to 500 satoshis
    const sbtcAmount =
      body.sbtcAmount !== undefined
        ? BigInt(typeof body.sbtcAmount === "string" ? body.sbtcAmount : Math.floor(body.sbtcAmount))
        : BigInt(500);

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
    const { stacksTransaction, stacksTxSigner } = await constructSwapTx(
      normalizedPublicKey,
      sbtcAmount,
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
      organizationId,
      walletAccountId,
      stacksAddress,
      sbtcAmount: sbtcAmount.toString(),
      transactionHex: serializedTransaction,
      signature: formattedSignature,
      broadcastResult,
    });
  } catch (error) {
    console.error("Swap sBTC to STX failed:", error);

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
