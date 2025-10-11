import {
  StacksTransactionWire,
  TransactionSigner,
  SingleSigSpendingCondition,
  createMessageSignature,
  broadcastTransaction as stacksBroadcastTransaction,
  sigHashPreSign,
} from "@stacks/transactions";

type StacksTransaction = StacksTransactionWire;

export interface TurnkeySignatureParts {
  r: string;
  s: string;
}

export interface StacksBroadcastError extends Error {
  code: string;
  reason?: string;
  reasonData?: Record<string, bigint> & {
    actual?: bigint;
    expected?: bigint;
  };
  txId?: string;
  raw: unknown;
}

export function isStacksBroadcastError(error: unknown): error is StacksBroadcastError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as Record<string, unknown>).code === "string"
  );
}

const MICRO_STX_FACTOR = BigInt(1000000);

export function formatMicroStx(value: bigint): string {
  const zero = BigInt(0);
  const negative = value < zero;
  const abs = negative ? -value : value;
  const whole = abs / MICRO_STX_FACTOR;
  const fraction = abs % MICRO_STX_FACTOR;
  const fractionStr = fraction === zero ? "" : fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fractionStr ? `.${fractionStr}` : ""}`;
}

/**
 * Format Turnkey signature to VRS format (130 chars) for Stacks.
 * Turnkey already provides the correct V (recovery ID), so we use it directly.
 */
export function formatSignatureToVRS(signature: { v: string; r: string; s: string }): string {
  const normalize = (component: string) =>
    component.startsWith('0x') ? component.slice(2) : component;

  const vClean = normalize(signature.v);
  const rClean = normalize(signature.r);
  const sClean = normalize(signature.s);

  if (vClean.length > 2) {
    throw new Error(`V component should be 2 hex characters, got ${vClean.length}`);
  }
  if (rClean.length > 64 || sClean.length > 64) {
    throw new Error('Turnkey signature components exceed expected length of 64 hex characters.');
  }

  const vrsSignature = `${vClean.padStart(2, '0')}${rClean.padStart(64, '0')}${sClean.padStart(64, '0')}`;

  if (vrsSignature.length !== 130) {
    throw new Error(`Invalid signature length ${vrsSignature.length}. Expected 130 characters (V+R+S).`);
  }

  console.log('Formatted VRS signature:', vrsSignature);
  console.log('V:', vClean.padStart(2, '0'));
  console.log('R:', rClean.padStart(64, '0'));
  console.log('S:', sClean.padStart(64, '0'));

  return vrsSignature;
}

/**
 * Generate all signature variants with different recovery IDs for testing
 * @param signature The raw signature (R+S only, without recovery ID/V component)
 * @returns Array of signature variants with recovery IDs 00, 01, 02, 03
 */
export function generateAllSignatureVariants(signature: string) {
  let hexSig = signature.startsWith('0x') ? signature.slice(2) : signature;

  console.log('=== SIGNATURE VARIANT GENERATION ===');
  console.log('Raw signature length:', signature.length);

  if (hexSig.length === 130) {
    console.warn('⚠️  WARNING: Signature includes recovery ID (V). Stripping V and continuing with R+S only.');
    console.warn('           Update signFunction to return 128 chars (R+S) as documented in docs/sign_tx_with_turnkey.md');
    hexSig = hexSig.slice(2);
  }

  console.log('Normalized hex signature length:', hexSig.length);
  console.log('Expected length: 128 (64 chars R + 64 chars S)');

  if (hexSig.length !== 128) {
    throw new Error(`Invalid signature length ${hexSig.length}. Expected 128 characters (R+S only).`);
  }

  const r = hexSig.slice(0, 64).padStart(64, '0');
  const s = hexSig.slice(64).padStart(64, '0');

  console.log('R component:', r);
  console.log('S component:', s);
  console.log('===================================');

  return ['00', '01', '02', '03'].map(v => ({
    v,
    r,
    s,
    formatted: `${v}${r}${s}`
  }));
}

/**
 * Systematic recovery ID testing with transaction broadcasting
 * Tries recovery IDs in priority order: 01, 00, 02, 03
 * @param signature The raw signature from the wallet
 * @param transaction The unsigned transaction
 * @param network The network to broadcast to
 * @returns Result object with success status and broadcast response
 */
export async function broadcastWithRecoveryTesting(
  signature: string,
  transaction: StacksTransaction,
  network: "testnet" | "mainnet" = "testnet"
): Promise<{
  success: boolean;
  txId?: string;
  response: any;
  signatureData: any;
  allVariantsTested: number;
}> {
  console.log('=== STACKS: SYSTEMATIC RECOVERY ID TESTING ===');
  const signatureVariants = generateAllSignatureVariants(signature);
  console.log(`Generated ${signatureVariants.length} signature variants for testing`);

  // Try recovery IDs in priority order: 01, 00, 02, 03
  const tryOrder = [1, 0, 2, 3]; // Indices for recovery IDs
  let broadcastResponse = null;
  let lastError = null;
  let successfulSignature = null;
  let txId: string | undefined = undefined;

  for (const index of tryOrder) {
    const variant = signatureVariants[index];
    console.log(`\n--- STACKS: Attempting Recovery ID ${variant.v} ---`);
    console.log('VRS signature:', variant.formatted);
    console.log('Transaction expects public key hash from:', transaction.auth.spendingCondition.signer);

    try {
      // Apply signature with current recovery ID to transaction
      try {
        const messageSignature = createMessageSignature(variant.formatted);
        (transaction.auth.spendingCondition as SingleSigSpendingCondition).signature = messageSignature;
        console.log('✅ Message signature created successfully');
      } catch (error) {
        console.log(`❌ STACKS: Recovery ID ${variant.v} - Failed to create message signature:`, error);
        lastError = { error: 'SignatureCreationFailed', message: String(error) };
        continue;
      }

      console.log(`STACKS: Broadcasting transaction with recovery ID ${variant.v}...`);


      // Try to broadcast
      const response = await stacksBroadcastTransaction({
        transaction: transaction,
        network
      });

      console.log(`STACKS: Broadcast result for recovery ID ${variant.v}:`, response);

      if ('error' in response && response.error) {
        console.log(`❌ STACKS: Recovery ID ${variant.v} failed:`, response.error, 'reason' in response ? response.reason : '');
        lastError = response;
        continue;
      }

      // Check if successful - response.txid exists on TxBroadcastResultOk
      if ('txid' in response && response.txid) {
        const cleanTxId = response.txid.replace(/"/g, "");
        console.log(`✅ STACKS: SUCCESS with recovery ID ${variant.v}!`);
        console.log(`Transaction ID: ${cleanTxId}`);
        broadcastResponse = response;
        successfulSignature = variant;
        txId = cleanTxId;
        break;
      }
    } catch (error: any) {
      console.log(`❌ STACKS: Recovery ID ${variant.v} threw error:`, error);
      lastError = {
        error: 'BroadcastException',
        message: error.message || String(error),
        reason: error.reason || 'Unknown'
      };
    }
  }

  const response = broadcastResponse || lastError;
  const signatureData = successfulSignature || signatureVariants[1]; // Default to '01' variant

  console.log('\n=== STACKS: FINAL RESULT ===');
  console.log('Success:', !!broadcastResponse);
  if (txId) {
    console.log('Transaction ID:', txId);
  }
  console.log('Signature variant used:', signatureData);
  console.log('=========================\n');

  return {
    success: !!broadcastResponse,
    txId,
    response,
    signatureData,
    allVariantsTested: signatureVariants.length
  };
}

/**
 * Generate the pre-sign signature hash for a Stacks transaction
 * This hash is what gets signed by Turnkey
 * Uses sigHashPreSign to generate the correct hash including auth type, fee, and nonce
 */
export function generatePreSignSigHash(transaction: StacksTransaction): string {
  const signer = new TransactionSigner(transaction);

  console.log('=== Pre-sign Hash Generation ===');
  console.log('Transaction public key:', transaction.auth.spendingCondition.signer);
  console.log('Auth type:', transaction.auth.authType);
  console.log('Fee:', transaction.auth.spendingCondition.fee.toString());
  console.log('Nonce:', transaction.auth.spendingCondition.nonce.toString());
  console.log('Base sigHash:', signer.sigHash);

  // Generate the presign hash with auth type, fee, and nonce
  // This matches the format expected by Stacks signature verification
  const preSignSigHash = sigHashPreSign(
    signer.sigHash,
    transaction.auth.authType,
    transaction.auth.spendingCondition.fee,
    transaction.auth.spendingCondition.nonce
  );

  console.log('Generated preSignSigHash:', preSignSigHash);
  console.log('================================');

  return preSignSigHash;
}

/**
 * Generic sign and broadcast function that can be used by any transaction type
 * @param transaction The unsigned transaction
 * @param signFunction Function that signs the hash and returns VRS signature (130 chars)
 * @param network The network to broadcast to
 * @returns Result with transaction ID
 */
export async function signAndBroadcastTransaction(
  transaction: StacksTransaction,
  signFunction: (payload: string) => Promise<string>,
  network: "testnet" | "mainnet" = "testnet"
): Promise<{ txId: string; transaction: StacksTransaction }> {
  try {
    // 1. Generate pre-sign signature hash
    console.log('Step 2: Generating pre-sign signature hash...');
    const preSignSigHash = generatePreSignSigHash(transaction);
    console.log('Pre-sign hash:', preSignSigHash);

    // 2. Sign with Turnkey
    console.log('Step 3: Signing with Turnkey...');
    const vrsSignature = await signFunction(preSignSigHash);
    console.log('VRS Signature received (length:', vrsSignature.length, ')');
    console.log('VRS Signature:', vrsSignature);

    // 3. Apply signature to transaction
    console.log('Step 4: Applying signature to transaction...');
    const messageSignature = createMessageSignature(vrsSignature);
    (transaction.auth.spendingCondition as SingleSigSpendingCondition).signature = messageSignature;
    console.log('✅ Signature applied to transaction');

    // 4. Broadcast transaction
    console.log('Step 5: Broadcasting transaction...');
    const result = await stacksBroadcastTransaction({
      transaction: transaction,
      network
    });

    console.log('Broadcast result:', result);

    // Treat explicit errors first, even if a txid is present
    if ('error' in result && result.error) {
      console.error('❌ Transaction broadcast failed:', result);
      throw buildStacksBroadcastError(result);
    }

    if ('txid' in result && result.txid) {
      const cleanTxId = result.txid.replace(/"/g, "");
      console.log('✅ Transaction broadcast successfully!');
      console.log('Transaction ID:', cleanTxId);

      return {
        txId: cleanTxId,
        transaction: transaction
      };
    } else {
      throw new Error('Unexpected broadcast response format');
    }
  } catch (error) {
    console.error('Error in signAndBroadcastTransaction:', error);
    throw error;
  }
}

function buildStacksBroadcastError(result: Record<string, any>): StacksBroadcastError {
  const code = typeof result.error === "string" ? result.error : "BroadcastError";
  const reason = typeof result.reason === "string" ? result.reason : undefined;
  const reasonData = parseReasonData(result.reason_data);

  let message = code;
  if (reason) {
    message += `: ${reason}`;
  }

  if (reason === "NotEnoughFunds" && reasonData?.actual !== undefined && reasonData?.expected !== undefined) {
    message += ` (have ${formatMicroStx(reasonData.actual)} STX, need ${formatMicroStx(reasonData.expected)} STX)`;
  }

  if (typeof result.txid === "string" && result.txid.length > 0) {
    message += ` (txid: ${result.txid})`;
  }

  const error = new Error(message) as StacksBroadcastError;
  error.code = code;
  error.reason = reason;
  error.reasonData = reasonData;
  error.txId = typeof result.txid === "string" ? result.txid : undefined;
  error.raw = result;
  return error;
}

function parseReasonData(reasonData: unknown): StacksBroadcastError["reasonData"] | undefined {
  if (!reasonData || typeof reasonData !== "object") {
    return undefined;
  }

  const entries = Object.entries(reasonData as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === "string") {
        try {
          const parsed = BigInt(value);
          return [key, parsed] as const;
        } catch (
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _error
        ) {
          return null;
        }
      }
      return null;
    })
    .filter((entry): entry is [string, bigint] => entry !== null);

  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce<Record<string, bigint>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}
