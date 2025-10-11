import {
  makeUnsignedSTXTokenTransfer,
  makeUnsignedContractCall,
  UnsignedTokenTransferOptions,
  UnsignedContractCallOptions,
  StacksTransactionWire,
  TransactionSigner,
  SingleSigSpendingCondition,
  createMessageSignature,
  broadcastTransaction as stacksBroadcastTransaction,
  sigHashPreSign,
  PostConditionMode,
  Cl,
  bufferCVFromString,
} from "@stacks/transactions";

type StacksTransaction = StacksTransactionWire;

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

    try {
      // Apply signature with current recovery ID to transaction
      try {
        const messageSignature = createMessageSignature(variant.formatted);
        (transaction.auth.spendingCondition as SingleSigSpendingCondition).signature = messageSignature;
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

      // Check if successful - response.txid exists on TxBroadcastResultOk
      if ('txid' in response && response.txid) {
        const cleanTxId = response.txid.replace(/"/g, "");
        console.log(`✅ STACKS: SUCCESS with recovery ID ${variant.v}!`);
        console.log(`Transaction ID: ${cleanTxId}`);
        broadcastResponse = response;
        successfulSignature = variant;
        txId = cleanTxId;
        break;
      } else if ('error' in response) {
        // TxBroadcastResultRejected
        console.log(`❌ STACKS: Recovery ID ${variant.v} failed:`, response.error, 'reason' in response ? response.reason : '');
        lastError = response;
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

  // Generate the presign hash with auth type, fee, and nonce
  // This matches the format expected by Stacks signature verification
  const preSignSigHash = sigHashPreSign(
    signer.sigHash,
    transaction.auth.authType,
    transaction.auth.spendingCondition.fee,
    transaction.auth.spendingCondition.nonce
  );

  return preSignSigHash;
}

/**
 * Construct an unsigned Stacks STX token transfer transaction
 */
export async function constructStacksTransaction(
  params: UnsignedTokenTransferOptions
): Promise<StacksTransaction> {
  const transaction = await makeUnsignedSTXTokenTransfer(params);
  return transaction;
}


/**
 * Complete flow: construct, sign, and broadcast a Stacks transaction
 */
export interface SignAndBroadcastParams {
  recipientAddress: string;
  amount: bigint;
  senderAddress: string;
  publicKey: string;
  network: "testnet" | "mainnet";
  nonce: bigint;
  fee?: bigint;
  memo?: string;
  signFunction: (payload: string) => Promise<string>;
}

export async function signAndBroadcastStacksTransaction(
  params: SignAndBroadcastParams
): Promise<{ txId: string; transaction: StacksTransaction }> {
  const {
    recipientAddress,
    amount,
    publicKey,
    network,
    nonce,
    fee,
    memo,
    signFunction,
  } = params;

  try {
    console.log('=== Starting Stacks Transaction Flow ===');
    console.log('Recipient:', recipientAddress);
    console.log('Amount:', amount.toString(), 'microSTX');
    console.log('Network:', network);
    console.log('Public Key (for transaction):', publicKey);
    console.log('Public Key length:', publicKey.length);
    console.log('Nonce:', nonce.toString());
    console.log('Fee:', (fee || BigInt(200)).toString());

    debugger;

    // 1. Construct unsigned transaction
    console.log('\nStep 1: Constructing unsigned transaction...');
    const transaction = await constructStacksTransaction({
      recipient: recipientAddress,
      amount,
      publicKey: publicKey,
      network: network,
      nonce,
      fee: fee || BigInt(200),
      memo: memo || "",
    });
    console.log('✅ Transaction constructed successfully');

    debugger;

    // 2. Generate pre-sign signature hash
    console.log('Step 2: Generating pre-sign signature hash...');
    const preSignSigHash = generatePreSignSigHash(transaction);
    console.log('Pre-sign hash:', preSignSigHash);

    // 3. Sign with Turnkey
    console.log('Step 3: Signing with Turnkey...');
    debugger;
    const signature = await signFunction(preSignSigHash);
    console.log('Signature received from Turnkey:', signature.substring(0, 20) + '...');

    // 4. Broadcast with recovery ID testing
    console.log('Step 4: Broadcasting with recovery ID testing...');
    const result = await broadcastWithRecoveryTesting(
      signature,
      transaction,
      network
    );

    if (!result.success) {
      console.error('Transaction broadcast failed after testing all recovery IDs');
      console.error('Last error:', result.response);
      throw new Error(
        `Transaction broadcast failed: ${result.response?.message || result.response?.error || 'Unknown error'}`
      );
    }

    console.log('=== Transaction Successfully Broadcast ===');
    console.log('Transaction ID:', result.txId);
    console.log('Recovery ID used:', result.signatureData.v);

    return {
      txId: result.txId!,
      transaction: transaction
    };
  } catch (error) {
    console.error('Error in signAndBroadcastStacksTransaction:', error);
    throw error;
  }
}

/**
 * Construct an unsigned Stacks sBTC token transfer transaction (contract call)
 */
export async function constructSbtcTransferTransaction(
  params: {
    publicKey: string;
    senderAddress: string;
    recipientAddress: string;
    amount: bigint;
    network: "testnet" | "mainnet";
    nonce: bigint;
    fee?: bigint;
    memo?: string;
  }
): Promise<StacksTransaction> {
  const { publicKey, senderAddress, recipientAddress, amount, network, nonce, fee, memo } = params;

  const txOptions: UnsignedContractCallOptions = {
    publicKey: publicKey,
    contractAddress: "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT",
    contractName: "sbtc-token",
    functionName: 'transfer',
    functionArgs: [
      Cl.uint(amount),
      Cl.address(senderAddress),
      Cl.address(recipientAddress),
      Cl.some(Cl.bufferFromUtf8(memo || ""))
    ],
    network: network,
    nonce,
    fee: fee || BigInt(14640),
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeUnsignedContractCall(txOptions);
  return transaction;
}

/**
 * Complete flow: construct, sign, and broadcast an sBTC transfer transaction
 */
export interface SignAndBroadcastSbtcParams {
  recipientAddress: string;
  amount: bigint;
  senderAddress: string;
  publicKey: string;
  network: "testnet" | "mainnet";
  nonce: bigint;
  fee?: bigint;
  memo?: string;
  signFunction: (payload: string) => Promise<string>;
}

export async function signAndBroadcastSbtcTransaction(
  params: SignAndBroadcastSbtcParams
): Promise<{ txId: string; transaction: StacksTransaction }> {
  const {
    recipientAddress,
    amount,
    senderAddress,
    publicKey,
    network,
    nonce,
    fee,
    memo,
    signFunction,
  } = params;

  try {
    console.log('=== Starting sBTC Transfer Transaction Flow ===');
    console.log('Sender:', senderAddress);
    console.log('Recipient:', recipientAddress);
    console.log('Amount:', amount.toString(), 'sats');
    console.log('Network:', network);
    console.log('Public Key (for transaction):', publicKey);
    console.log('Public Key length:', publicKey.length);
    console.log('Nonce:', nonce.toString());
    console.log('Fee:', (fee || BigInt(14640)).toString());

    debugger;

    // 1. Construct unsigned transaction
    console.log('\nStep 1: Constructing unsigned sBTC transfer transaction...');
    const transaction = await constructSbtcTransferTransaction({
      publicKey,
      senderAddress,
      recipientAddress,
      amount,
      network,
      nonce,
      fee: fee || BigInt(14640),
      memo: memo || "",
    });
    console.log('✅ Transaction constructed successfully');

    debugger;

    // 2. Generate pre-sign signature hash
    console.log('Step 2: Generating pre-sign signature hash...');
    const preSignSigHash = generatePreSignSigHash(transaction);
    console.log('Pre-sign hash:', preSignSigHash);

    // 3. Sign with Turnkey
    console.log('Step 3: Signing with Turnkey...');
    debugger;
    const signature = await signFunction(preSignSigHash);
    console.log('Signature received from Turnkey:', signature.substring(0, 20) + '...');


    debugger;
    // 4. Broadcast with recovery ID testing
    console.log('Step 4: Broadcasting with recovery ID testing...');
    const result = await broadcastWithRecoveryTesting(
      signature,
      transaction,
      network
    );

    if (!result.success) {
      console.error('Transaction broadcast failed after testing all recovery IDs');
      console.error('Last error:', result.response);
      throw new Error(
        `Transaction broadcast failed: ${result.response?.message || result.response?.error || 'Unknown error'}`
      );
    }

    console.log('=== sBTC Transaction Successfully Broadcast ===');
    console.log('Transaction ID:', result.txId);
    console.log('Recovery ID used:', result.signatureData.v);

    return {
      txId: result.txId!,
      transaction: transaction
    };
  } catch (error) {
    console.error('Error in signAndBroadcastSbtcTransaction:', error);
    throw error;
  }
}
