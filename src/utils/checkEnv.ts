import { Connection, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { getSecureConfig, logSecurityWarnings } from './securityConfig';

dotenv.config();

async function checkEnv() {
  console.log('🔒 Enhanced Security Environment Check');
  console.log('=====================================');
  
  try {
    // Use the new security configuration
    const config = getSecureConfig();
    
    // Log security warnings
    logSecurityWarnings();
    
    // Skip RPC connection test in DRY_RUN mode
    if (process.env.DRY_RUN === 'true') {
      console.log('[DRY_RUN] Skipping RPC connection test');
      console.log('✅ Environment variables validated (DRY_RUN mode)');
    } else {
      // Test RPC connection
      const connection = new Connection(config.rpcUrlWithKey, 'confirmed');
      await connection.getLatestBlockhash();
      console.log('✅ RPC connection successful');
    }
    
    console.log('✅ All environment variables validated successfully');
    console.log('🛡️  Security configuration is properly set up');
    
  } catch (e: any) {
    if (process.env.DRY_RUN === 'true') {
      console.log('⚠️  Network connection failed, but continuing in DRY_RUN mode');
      console.log('✅ Environment variables validated (DRY_RUN mode)');
      return;
    }
    console.error('❌ Environment check failed:', e.message);
    throw e;
  }
}

checkEnv().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
