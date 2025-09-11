import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const METADATA = {
  name: 'Omega Prime Token',
  symbol: 'ΩAGENT',
  description: 'Agent guild utility token powering Ω-Prime automations on Solana.',
  image: 'https://<hosted-image>/logo.png',
  external_url: 'https://<site>',
};

async function setTokenMetadata() {
  const cacheDir = path.join(process.cwd(), '.cache');
  const mintCachePath = path.join(cacheDir, 'mint.json');
  const userAuthPath = path.join(cacheDir, 'user_auth.json');

  if (!fs.existsSync(mintCachePath) || !fs.existsSync(userAuthPath)) {
    console.error('Mint or user auth not found. Run mint creation first.');
    process.exit(1);
  }

  const mintData = JSON.parse(fs.readFileSync(mintCachePath, 'utf-8'));
  const userAuthJson = JSON.parse(fs.readFileSync(userAuthPath, 'utf-8'));
  
  const umi = createUmi(process.env.RPC_URL!);
  const userAuthKeypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(userAuthJson));
  umi.use(keypairIdentity(userAuthKeypair));
  
  const mint = publicKey(mintData.mint);
  const metadataPda = findMetadataPda(umi, { mint });

  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(METADATA)).toString('base64')}`;

  try {
    // Always try to create metadata - if it exists, the instruction will fail gracefully
    await createMetadataAccountV3(umi, {
      mint,
      mintAuthority: umi.identity,
      payer: umi.identity,
      updateAuthority: umi.identity,
      data: {
        name: METADATA.name,
        symbol: METADATA.symbol,
        uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);
    
    console.log(`✅ Metadata created for mint ${mint}. URI: ${uri.slice(0, 50)}...`);
    console.log(`📍 Metadata PDA: ${metadataPda}`);
    
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg.includes('already exists') || errMsg.includes('Account already in use')) {
      console.log(`ℹ️  Metadata already exists for mint ${mint}`);
      console.log(`📍 Metadata PDA: ${metadataPda}`);
    } else {
      console.error(`❌ Metadata setting failed: ${errMsg}`);
      process.exit(1);
    }
  }
}

setTokenMetadata().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
