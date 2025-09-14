import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import fetch from 'node-fetch';

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

  // Optionally add Helius rebate-address query param when configured.
  // Prefer HELIUS_REBATE_ADDRESS, fall back to REBATE_ADDRESS.
  const rebateAddress = process.env.HELIUS_REBATE_ADDRESS || process.env.REBATE_ADDRESS;

  // If rebate address is set, append it as a `rebate-address` query parameter.
  // This is optional and only added when explicitly configured.
  let targetUrl = relayerUrl;
  if (rebateAddress && typeof rebateAddress === 'string' && rebateAddress.length > 0) {
    const separator = relayerUrl.includes('?') ? '&' : '?';
    targetUrl = `${relayerUrl}${separator}rebate-address=${encodeURIComponent(rebateAddress)}`;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ signedTransactionBase64: b64 }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || `Relayer error (attempt ${attempt})`);
      await connection.confirmTransaction({ signature: j.txSignature, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log(`Transaction confirmed: https://explorer.solana.com/tx/${j.txSignature} (${Date.now() - start}ms)`);
      return j.txSignature;
    } catch (e: any) {
  if (attempt === 3) throw new Error(`Relayer failed after 3 attempts: ${e.message}`);
  const delay = (ms: number) => new Promise<void>((res) => (global as any).setTimeout(res, ms));
  await delay(1000);
    }
  }
  throw new Error('Relayer unreachable');
}
