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

  // Prepare headers for Helius API
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json'
  };
  
  // Use API key from environment or parameter
  const heliusApiKey = apiKey || process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    throw new Error('Helius API key is required for relayer service');
  }

  // Add rebate-address query param using creator address
  const creatorAddress = loadOrCreateUserAuth().publicKey.toBase58();
  const rebateUrl = relayerUrl.includes('?')
    ? `${relayerUrl}?api-key=${heliusApiKey}&rebate-address=${creatorAddress}`
    : `${relayerUrl}?api-key=${heliusApiKey}&rebate-address=${creatorAddress}`;

  console.log(`🚀 Sending transaction via Helius relayer...`);
  console.log(`   Size: ${b64.length} bytes`);
  console.log(`   Fee payer: ${relayerPubkey}`);
  console.log(`   Rebate address: ${creatorAddress}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(rebateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          encodedTransaction: b64,
          skipPreflight: false,
          maxRetries: 2
        }),
      });
      
      const responseText = await res.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ Failed to parse relayer response (attempt ${attempt}):`, responseText);
        throw new Error(`Invalid JSON response from relayer: ${responseText.slice(0, 200)}`);
      }

      console.log(`📡 Relayer response (attempt ${attempt}):`, responseData);

      // Handle different response formats from Helius
      let signature: string;
      if (responseData.result) {
        signature = responseData.result;
      } else if (responseData.signature) {
        signature = responseData.signature;
      } else if (responseData.txSignature) {
        signature = responseData.txSignature;
      } else if (responseData.error) {
        throw new Error(`Helius relayer error: ${JSON.stringify(responseData.error)}`);
      } else {
        throw new Error(`Unexpected relayer response format: ${JSON.stringify(responseData)}`);
      }

      // Confirm the transaction
      console.log(`⏳ Confirming transaction: ${signature}`);
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight }, 
        'confirmed'
      );
      
      console.log(`✅ Transaction confirmed: https://explorer.solana.com/tx/${signature} (${Date.now() - start}ms)`);
      return signature;
      
    } catch (e: any) {
      console.error(`❌ Relayer attempt ${attempt} failed:`, e.message);
      
      if (attempt === 3) {
        console.error(`💥 All relayer attempts failed. Last error:`, e.message);
        throw new Error(`Helius relayer failed after 3 attempts: ${e.message}`);
      }
      
      // Wait before retrying
      const delay = attempt * 1000; // Exponential backoff
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Relayer unreachable after all attempts');
}
