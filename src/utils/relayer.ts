import { Connection, PublicKey, Transaction } from '@solana/web3.js';

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
      const res = await fetch(rebateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ signedTransactionBase64: b64 }),
      });
      let j;
      try {
        j = await res.json();
      } catch (jsonErr) {
        console.error('Failed to parse relayer response as JSON:', jsonErr);
        const text = await res.text();
        console.error('Relayer raw response:', text);
        throw new Error('Relayer response not JSON');
      }
      if (!j.success) {
        console.error('Relayer error response:', j);
        throw new Error(j.error || `Relayer error (attempt ${attempt})`);
      }
      await connection.confirmTransaction({ signature: j.txSignature, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log(`Transaction confirmed: https://explorer.solana.com/tx/${j.txSignature} (${Date.now() - start}ms)`);
      return j.txSignature;
    } catch (e: any) {
      console.error('Relayer attempt error:', e);
      if (attempt === 3) throw new Error(`Relayer failed after 3 attempts: ${e.message || e}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Relayer unreachable');
}
