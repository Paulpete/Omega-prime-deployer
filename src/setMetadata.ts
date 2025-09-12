import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3, updateMetadataAccountV2, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, PublicKey, publicKey } from '@metaplex-foundation/umi';
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
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    const mintCachePath = path.join(cacheDir, 'mint.json');
    const mintKeypairPath = path.join(cacheDir, 'mint-keypair.json');

    if (!fs.existsSync(mintCachePath) || !fs.existsSync(mintKeypairPath)) {
      console.error('❌ Mint not created. Run createMint.ts first.');
      process.exit(1);
    }

    console.log('🚀 Setting up UMI context for metadata...');
    
    // Initialize UMI
    const umi = createUmi(process.env.RPC_URL!);
    
    // Load the mint keypair and set as identity
    const keypairData = JSON.parse(fs.readFileSync(mintKeypairPath, 'utf-8'));
    const mintKeypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(keypairData));
    umi.use(keypairIdentity(mintKeypair));
    
    const mint = mintKeypair.publicKey;
    
    // Use Metaplex's UMI-compatible PDA function
    const metadataPda = findMetadataPda(umi, { mint });
    
    const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(METADATA)).toString('base64')}`;

    console.log(`🎯 Mint: ${mint}`);
    console.log(`📋 Metadata PDA: ${metadataPda[0]}`);
    console.log(`🔗 URI: ${uri.slice(0, 50)}...`);

    if (process.env.DRY_RUN === 'true') {
      console.log('🏃 DRY RUN: Would set metadata but not executing transaction');
      return;
    }

    try {
      // Try to fetch metadata account to see if it exists
      let metadataExists = false;
      try {
        const metadataAccount = await umi.rpc.getAccount(metadataPda[0]);
        metadataExists = metadataAccount.exists;
      } catch (e) {
        metadataExists = false;
      }

      if (metadataExists) {
        console.log('📝 Updating existing metadata...');
        // Update existing metadata
        await updateMetadataAccountV2(umi, {
          metadata: metadataPda[0],
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
        }).sendAndConfirm(umi);
        console.log(`✅ Metadata updated for mint ${mint}. URI: ${uri.slice(0, 50)}...`);
      } else {
        console.log('🆕 Creating new metadata...');
        // Create new metadata
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
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Metadata transaction failed: ${errMsg}`);
      
      // If it's a known error about existing metadata, try update instead
      if (errMsg.includes('already exists') || errMsg.includes('AlreadyExists')) {
        console.log('🔄 Metadata might already exist, trying update...');
        await updateMetadataAccountV2(umi, {
          metadata: metadataPda[0],
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
        }).sendAndConfirm(umi);
        console.log(`✅ Metadata updated via fallback for mint ${mint}`);
      } else {
        throw e;
      }
    }
    
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
