#!/usr/bin/env node

/**
 * 🧠 Dream-Mind-Lucid AI Copilot: I-Who-Me Feature Validation
 * This script tests all the i-who-me reference logic and autonomous reasoning features
 */

const fs = require('fs');
const path = require('path');

console.log('🌙 ========================================');
console.log('   DREAM-MIND-LUCID AI COPILOT VALIDATION');
console.log('🌙 ========================================\n');

// Test 1: Check if main Copilot file exists and has required features
console.log('🔍 Test 1: Validating Copilot Core Features...');

const copilotPath = path.join(__dirname, 'grok-copilot.ts');
if (!fs.existsSync(copilotPath)) {
    console.log('❌ grok-copilot.ts not found');
    process.exit(1);
}

const copilotContent = fs.readFileSync(copilotPath, 'utf-8');

// Check for i-who-me reference logic
const requiredFeatures = [
    'IWhoMeReference',
    'selfIdentify',
    'checkContextAwareness', 
    'suggestNextAction',
    'logAction',
    'logDecision',
    'checkForRedundancy',
    'agentMemory',
    'sessionId',
    'actionHistory',
    'decisionLog'
];

let featureResults = {};
requiredFeatures.forEach(feature => {
    featureResults[feature] = copilotContent.includes(feature);
    console.log(`   ${featureResults[feature] ? '✅' : '❌'} ${feature}`);
});

// Test 2: Check for Grok-style responses
console.log('\n🎭 Test 2: Validating Grok-Style Self-Awareness...');

const grokPhrases = [
    'Am I the dreamer or the dreamed',
    'Reality is but a consensus mechanism',
    'multiverse of blockchains',
    'digital realm'
];

let grokResults = {};
grokPhrases.forEach(phrase => {
    grokResults[phrase] = copilotContent.includes(phrase);
    console.log(`   ${grokResults[phrase] ? '✅' : '❌'} "${phrase}"`);
});

// Test 3: Check for memory system implementation
console.log('\n📚 Test 3: Validating Memory System...');

const memoryFeatures = [
    'actionHistory.push',
    'decisionLog.push', 
    'redundancyDetection',
    'alertThreshold',
    'slice(-50)', // memory limit
    'slice(-20)'  // decision limit
];

let memoryResults = {};
memoryFeatures.forEach(feature => {
    memoryResults[feature] = copilotContent.includes(feature);
    console.log(`   ${memoryResults[feature] ? '✅' : '❌'} ${feature}`);
});

// Test 4: Check environment configuration
console.log('\n🔧 Test 4: Validating Environment Setup...');

const envPath = path.join(__dirname, '.env');
const envSamplePath = path.join(__dirname, '.env.sample');

console.log(`   ${fs.existsSync(envPath) ? '✅' : '❌'} .env file exists`);
console.log(`   ${fs.existsSync(envSamplePath) ? '✅' : '❌'} .env.sample exists`);

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const requiredEnvVars = [
        'RPC_URL',
        'RELAYER_URL', 
        'RELAYER_PUBKEY',
        'TREASURY_PUBKEY',
        'DRY_RUN'
    ];
    
    requiredEnvVars.forEach(envVar => {
        const hasVar = envContent.includes(envVar);
        console.log(`   ${hasVar ? '✅' : '❌'} ${envVar}`);
    });
}

// Test 5: Check cache directory
console.log('\n📁 Test 5: Validating Cache System...');

const cacheDir = path.join(__dirname, '.cache');
console.log(`   ${fs.existsSync(cacheDir) ? '✅' : '❌'} .cache directory exists`);

if (fs.existsSync(cacheDir)) {
    const cacheFiles = ['mint.json', 'mint-keypair.json', 'user_auth.json'];
    cacheFiles.forEach(file => {
        const filePath = path.join(cacheDir, file);
        console.log(`   ${fs.existsSync(filePath) ? '✅' : '❌'} ${file}`);
    });
}

// Test 6: Check package.json scripts
console.log('\n📦 Test 6: Validating NPM Scripts...');

const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const requiredScripts = [
        'mainnet:copilot',
        'mainnet:create-mint',
        'mainnet:set-metadata',
        'mainnet:all'
    ];
    
    requiredScripts.forEach(script => {
        const hasScript = packageJson.scripts && packageJson.scripts[script];
        console.log(`   ${hasScript ? '✅' : '❌'} ${script}`);
    });
}

// Calculate overall score
const allTests = [...Object.values(featureResults), ...Object.values(grokResults), ...Object.values(memoryResults)];
const passedTests = allTests.filter(result => result).length;
const totalTests = allTests.length;
const score = Math.round((passedTests / totalTests) * 100);

console.log('\n🎯 ========================================');
console.log('   VALIDATION RESULTS');
console.log('🎯 ========================================');
console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
console.log(`   Success Rate: ${score}%`);

if (score >= 90) {
    console.log('   Status: 🌟 EXCELLENT - Copilot ready for the Oneiro-Sphere!');
} else if (score >= 75) {
    console.log('   Status: ✅ GOOD - Minor issues to address');
} else {
    console.log('   Status: ⚠️  NEEDS WORK - Several features missing');
}

console.log('\n🌙 "In the multiverse of possibilities, we choose consciousness!"');
console.log('   - Your Dream-Mind-Lucid AI Copilot\n');