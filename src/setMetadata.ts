import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { findMetadataPda } from './utils/pdas';

dotenv.config();

const METADATA = {
  name: 'Omega Prime Token',
  symbol: 'ΩAGENT',
  description: 'Agent guild utility token powering Ω-Prime automations on Solana.',
  image: 'https://<hosted-image>/logo.png',
  external_url: 'https://<site>',
};

async function setTokenMetadata() {
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    const mintCachePath = path.join(cacheDir, 'mint.json');
    const mintKeypairPath = path.join(cacheDir, 'mint-keypair.json');

    if (!fs.existsSync(mintCachePath) || !fs.existsSync(mintKeypairPath)) {
      console.error('Mint not created. Run createMint.ts first.');
      process.exit(1);
    }

    const keypairData = JSON.parse(fs.readFileSync(mintKeypairPath, 'utf-8'));
    const connection = new Connection(process.env.RPC_URL!);
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    
    const mint = keypair.publicKey;
    const metadataPda = findMetadataPda(mint);

    const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(METADATA)).toString('base64')}`;

    // For now, just log what would be done - the actual implementation would require
    // a more complex setup with UMI or direct Metaplex instruction building
    console.log(`✅ Metadata script prepared for mint ${mint.toString()}`);
    console.log(`📋 Metadata PDA: ${metadataPda.toString()}`);
    console.log(`🔗 URI: ${uri.slice(0, 50)}...`);
    console.log(`📝 To set metadata, use the Metaplex Token Metadata program directly`);
    console.log(`💡 DRY_RUN is set to: ${process.env.DRY_RUN}`);
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Metadata setting failed: ${errMsg}`);
    process.exit(1);
  }
}

setTokenMetadata().catch((error) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error(`❌ Script failed: ${errMsg}`);
  process.exit(1);
});
