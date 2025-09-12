import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

import { loadOrCreateUserAuth } from './wallet';

export async function sendViaRelayer(
  connection: Connection,
  relayerPubkey: string,
  relayerUrl: string,
  tx: Transaction,
  apiKey?: string
): Promise<string> {
  const start = Date.now();
  tx.feePayer = new PublicKey(relayerPubkey);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  const b64 = tx.serialize({ requireAllSignatures: false }).toString('base64');
  if (process.env.DRY_RUN === 'true') {
    console.log(`[DRY_RUN] Transaction base64: ${b64.slice(0, 120)}...`);
    console.log(`[DRY_RUN] Transaction size: ${b64.length} bytes`);
    return 'DRY_RUN_SIGNATURE';
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  // Add rebate-address query param using creator address
  const creatorAddress = loadOrCreateUserAuth().publicKey.toBase58();
  const rebateUrl = relayerUrl.includes('?')
    ? `${relayerUrl}&rebate-address=${creatorAddress}`
    : `${relayerUrl}?rebate-address=${creatorAddress}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Sending transaction to relayer...`);
      const res = await fetch(rebateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ signedTransactionBase64: b64 }),
      });
      
      console.log(`Relayer response status: ${res.status}`);
      const j = await res.json();
      console.log(`Relayer response:`, JSON.stringify(j, null, 2));
      
      if (!j.success) {
        const errorMsg = j.error || j.message || `Relayer error (attempt ${attempt})`;
        throw new Error(errorMsg);
      }
      
      await connection.confirmTransaction({ signature: j.txSignature, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log(`Transaction confirmed: https://explorer.solana.com/tx/${j.txSignature} (${Date.now() - start}ms)`);
      return j.txSignature;
    } catch (e: any) {
      console.error(`Relayer attempt ${attempt} failed:`, e);
      if (e.message && e.message.includes('Method not found')) {
        console.error('ERROR: The endpoint does not support relayer functionality.');
        console.error('This appears to be a standard Solana RPC endpoint, not a relayer service.');
        console.error('Please configure a proper relayer service or switch to standard transaction sending.');
      }
      
      if (attempt === 3) {
        const errorDetails = e.message || JSON.stringify(e);
        throw new Error(`Relayer failed after 3 attempts: ${errorDetails}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Relayer unreachable');
}

/**
 * Send transaction directly using standard Solana transaction sending
 * This requires the user's wallet to have SOL for transaction fees
 */
export async function sendTransactionDirect(
  connection: Connection,
  tx: Transaction,
  signers: any[]
): Promise<string> {
  if (process.env.DRY_RUN === 'true') {
    console.log('[DRY_RUN] Direct transaction sending simulated');
    console.log(`[DRY_RUN] Transaction would be signed by ${signers.length} signers`);
    return 'DRY_RUN_SIGNATURE';
  }

  try {
    console.log('Sending transaction directly...');
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      signers,
      { commitment: 'confirmed' }
    );
    
    console.log(`Transaction confirmed: https://explorer.solana.com/tx/${signature}`);
    return signature;
  } catch (error) {
    console.error('Direct transaction failed:', error);
    throw error;
  }
}
