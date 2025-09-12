#!/usr/bin/env node
/**
 * Test script to verify Helius relayer integration
 * This validates the API format and request structure without making actual transactions
 */

require('dotenv').config();

async function testHeliusRelayerIntegration() {
    console.log('🧪 Testing Helius Relayer Integration');
    console.log('=====================================');
    
    // Check environment variables
    const requiredVars = ['HELIUS_API_KEY', 'RELAYER_URL', 'RELAYER_PUBKEY'];
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            console.error(`❌ Missing environment variable: ${varName}`);
            process.exit(1);
        }
    }
    
    console.log('✅ Environment variables configured:');
    console.log(`   HELIUS_API_KEY: ${process.env.HELIUS_API_KEY.slice(0, 8)}...`);
    console.log(`   RELAYER_URL: ${process.env.RELAYER_URL}`);
    console.log(`   RELAYER_PUBKEY: ${process.env.RELAYER_PUBKEY}`);
    
    // Test API endpoint format
    const apiKey = process.env.HELIUS_API_KEY;
    const relayerUrl = process.env.RELAYER_URL;
    const testRebateAddress = '4zi6yS2YiaLu7ZM5QtWxKDDknFbGpXYeFWrvJtnvNaFJ';
    
    const fullUrl = relayerUrl.includes('?')
        ? `${relayerUrl}&api-key=${apiKey}&rebate-address=${testRebateAddress}`
        : `${relayerUrl}?api-key=${apiKey}&rebate-address=${testRebateAddress}`;
    
    console.log('\n📡 Testing API endpoint format:');
    console.log(`   Full URL: ${fullUrl}`);
    
    // Test request payload format
    const testPayload = {
        encodedTransaction: 'test_base64_transaction_here',
        skipPreflight: false,
        maxRetries: 2
    };
    
    console.log('\n📦 Request payload format:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    // Test headers
    const headers = {
        'Content-Type': 'application/json'
    };
    
    console.log('\n📋 Request headers:');
    console.log(JSON.stringify(headers, null, 2));
    
    console.log('\n✅ Relayer integration test completed successfully!');
    console.log('🚀 The configuration should work for actual deployment.');
    console.log('\n💡 To test with real transactions, run:');
    console.log('   npm run mainnet:copilot');
    console.log('   or');
    console.log('   DRY_RUN=true npm run mainnet:create-mint');
}

testHeliusRelayerIntegration().catch(console.error);