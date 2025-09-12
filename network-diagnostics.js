#!/usr/bin/env node

/**
 * Network Diagnostic Script
 * Tests connectivity to Solana RPC endpoints and relayer services
 */

const https = require('https');
const { Connection } = require('@solana/web3.js');
require('dotenv').config();

async function testRPCConnectivity() {
  console.log('🌐 Testing Solana RPC Connectivity');
  console.log('==================================');
  
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  console.log(`RPC URL: ${rpcUrl}`);
  
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    console.log('📡 Testing connection...');
    
    const version = await connection.getVersion();
    console.log(`✅ Connected successfully!`);
    console.log(`   Solana Core: ${version['solana-core']}`);
    console.log(`   Feature Set: ${version['feature-set']}`);
    
    const blockHeight = await connection.getBlockHeight();
    console.log(`   Current Block Height: ${blockHeight}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('💡 Troubleshooting tips:');
    console.log('   - Check your internet connection');
    console.log('   - Verify the RPC URL in .env');
    console.log('   - Try using a different RPC endpoint');
    console.log('   - Check if your firewall blocks HTTPS connections');
    return false;
  }
}

async function testRelayerConnectivity() {
  if (process.env.USE_RELAYER !== 'true' || !process.env.RELAYER_URL) {
    console.log('⏭️  Relayer not configured, skipping relayer test');
    return true;
  }
  
  console.log('\\n🔄 Testing Relayer Connectivity');
  console.log('================================');
  
  const relayerUrl = process.env.RELAYER_URL;
  console.log(`Relayer URL: ${relayerUrl}`);
  
  try {
    console.log('📡 Testing relayer endpoint...');
    
    const response = await fetch(relayerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`   Response Status: ${response.status}`);
    
    if (response.status === 404) {
      console.log('⚠️  Relayer endpoint returned 404 - this may be expected for test requests');
      return true;
    } else if (response.status < 500) {
      console.log('✅ Relayer endpoint is reachable');
      return true;
    } else {
      console.log('❌ Relayer returned server error');
      return false;
    }
  } catch (error) {
    console.log(`❌ Relayer connection failed: ${error.message}`);
    console.log('💡 Troubleshooting tips:');
    console.log('   - Verify the RELAYER_URL in .env');
    console.log('   - Check if the relayer service is running');
    console.log('   - Ensure you have proper API keys configured');
    console.log('   - Consider switching to USE_RELAYER=false for direct transactions');
    return false;
  }
}

async function testEnvironmentConfiguration() {
  console.log('\\n⚙️  Testing Environment Configuration');
  console.log('=====================================');
  
  const requiredVars = ['RPC_URL', 'TREASURY_PUBKEY', 'DRY_RUN'];
  const warnings = [];
  const errors = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required variable: ${varName}`);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName].slice(0, 50)}...`);
    }
  }
  
  if (process.env.USE_RELAYER === 'true') {
    const relayerVars = ['RELAYER_URL', 'RELAYER_PUBKEY'];
    for (const varName of relayerVars) {
      if (!process.env[varName]) {
        warnings.push(`Relayer enabled but missing: ${varName}`);
      }
    }
  }
  
  if (warnings.length > 0) {
    console.log('\\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\\n❌ Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
    return false;
  }
  
  console.log('\\n✅ Environment configuration looks good!');
  return true;
}

async function main() {
  console.log('🚀 Omega Prime Deployment - Network Diagnostics');
  console.log('===============================================\\n');
  
  const results = [];
  
  // Test environment configuration
  results.push(await testEnvironmentConfiguration());
  
  // Test RPC connectivity
  results.push(await testRPCConnectivity());
  
  // Test relayer connectivity
  results.push(await testRelayerConnectivity());
  
  console.log('\\n📊 Diagnostic Summary');
  console.log('=====================');
  
  const allPassed = results.every(result => result);
  
  if (allPassed) {
    console.log('✅ All tests passed! Your configuration should work for deployment.');
    console.log('\\n🚀 Next steps:');
    console.log('   1. Run: npm run mainnet:all (in DRY_RUN mode first)');
    console.log('   2. Review the output for any issues');
    console.log('   3. Set DRY_RUN=false for live deployment');
  } else {
    console.log('❌ Some tests failed. Please address the issues above before deployment.');
    console.log('\\n🔧 Common fixes:');
    console.log('   - Update your .env file with correct values');
    console.log('   - Check your internet connection');
    console.log('   - Try a different RPC endpoint if connectivity fails');
    console.log('   - Set USE_RELAYER=false to use direct transactions');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);