import {
  makeUnsignedContractCall,
  UnsignedContractCallOptions,
  StacksTransactionWire,
  PostConditionMode,
  Cl,
} from "@stacks/transactions";
import { signAndBroadcastTransaction } from "../core/signingUtils";

type StacksTransaction = StacksTransactionWire;


export interface SignAndBroadcastSbtcParams {
  recipientAddress: string;
  amount: bigint;
  senderAddress: string;
  publicKey: string;
  network: "testnet" | "mainnet";
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
    
    console.log('Fee:', (fee || BigInt(14640)).toString());

    

    // 1. Construct unsigned transaction
   

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
    fee: fee || BigInt(14640),
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeUnsignedContractCall(txOptions);
    console.log('✅ Transaction constructed successfully');

    

    // 2-4. Sign and broadcast using core utilities
    return await signAndBroadcastTransaction(transaction, signFunction, network);
  } catch (error) {
    console.error('Error in signAndBroadcastSbtcTransaction:', error);
    throw error;
  }
}
