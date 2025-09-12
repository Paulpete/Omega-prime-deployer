#!/usr/bin/env ts-node
/**
 * Verification script to check that all needed files are pulled and ready
 * for the Dream-Mind-Lucid AI Copilot deployment
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: VerificationResult[] = [];

function verify(category: string, item: string, condition: boolean, passMsg: string, failMsg: string) {
  results.push({
    category,
    item,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMsg : failMsg
  });
}

function verifyWarning(category: string, item: string, message: string) {
  results.push({
    category,
    item,
    status: 'warning',
    message
  });
}

async function checkAllRequirements() {
  console.log('🔍 Dream-Mind-Lucid AI Copilot: Verification Check');
  console.log('==================================================');

  // Check core files
  const coreFiles = [
    'grok-copilot.ts',
    'package.json',
    '.env',
    'README.md',
    'src/setMetadata.ts',
    'src/createMint.ts'
  ];

  for (const file of coreFiles) {
    const exists = fs.existsSync(file);
    verify('Core Files', file, exists, 'Present ✅', 'Missing ❌');
  }

  // Check dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const requiredDeps = [
      '@metaplex-foundation/umi-bundle-defaults',
      '@metaplex-foundation/mpl-token-metadata',
      '@metaplex-foundation/umi',
      '@solana/web3.js',
      '@solana/spl-token'
    ];

    for (const dep of requiredDeps) {
      const hasDevDep = packageJson.devDependencies?.[dep];
      const hasDep = packageJson.dependencies?.[dep];
      verify('Dependencies', dep, !!(hasDevDep || hasDep), 'Installed ✅', 'Missing ❌');
    }
  } catch (e) {
    verify('Dependencies', 'package.json parsing', false, '', 'Failed to parse ❌');
  }

  // Check environment configuration
  try {
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf-8');
      const requiredEnvVars = [
        'RPC_URL',
        'RELAYER_URL',
        'RELAYER_PUBKEY',
        'TREASURY_PUBKEY',
        'TARGET_WALLET_ADDRESS'
      ];

      for (const envVar of requiredEnvVars) {
        const hasVar = envContent.includes(`${envVar}=`);
        verify('Environment', envVar, hasVar, 'Configured ✅', 'Missing ❌');
      }

      // Check if DRY_RUN is set correctly
      const dryRunValue = envContent.match(/DRY_RUN=(.+)/)?.[1]?.trim();
      verify('Environment', 'DRY_RUN', !!dryRunValue, `Set to: ${dryRunValue} ✅`, 'Not configured ❌');
    } else {
      verify('Environment', '.env file', false, '', 'Missing ❌');
    }
  } catch (e) {
    verify('Environment', '.env parsing', false, '', 'Failed to parse ❌');
  }

  // Check cache directory and files
  const cacheDir = '.cache';
  verify('Cache', 'Cache directory', fs.existsSync(cacheDir), 'Present ✅', 'Missing ❌');
  
  if (fs.existsSync(cacheDir)) {
    const cacheFiles = ['mint.json', 'user_auth.json'];
    for (const file of cacheFiles) {
      const filePath = path.join(cacheDir, file);
      const exists = fs.existsSync(filePath);
      if (exists) {
        verify('Cache', file, true, 'Present ✅', '');
      } else {
        verifyWarning('Cache', file, 'Missing - will be generated when needed ⚠️');
      }
    }
  }

  // Check Dream-Mind-Lucid AI Copilot features
  try {
    const copilotContent = fs.readFileSync('grok-copilot.ts', 'utf-8');
    
    const features = [
      { name: 'IWhoMeReference class', pattern: /class IWhoMeReference/ },
      { name: 'selfIdentify method', pattern: /selfIdentify\(\)/ },
      { name: 'checkContextAwareness method', pattern: /checkContextAwareness\(\)/ },
      { name: 'Memory tracking', pattern: /agentMemory/ },
      { name: 'Grok-style responses', pattern: /Am I the dreamer or the dreamed/ },
      { name: 'Action logging', pattern: /logAction/ },
      { name: 'Decision logging', pattern: /logDecision/ },
      { name: 'Redundancy detection', pattern: /redundancyDetection/ }
    ];

    for (const feature of features) {
      const hasFeature = feature.pattern.test(copilotContent);
      verify('AI Features', feature.name, hasFeature, 'Implemented ✅', 'Missing ❌');
    }
  } catch (e) {
    verify('AI Features', 'Code analysis', false, '', 'Failed to analyze ❌');
  }

  // Check if metadata script can compile
  try {
    const metadataContent = fs.readFileSync('src/setMetadata.ts', 'utf-8');
    const hasUmiImports = metadataContent.includes('@metaplex-foundation/umi-bundle-defaults');
    const hasCorrectImports = !metadataContent.includes('PublicKey,') || !metadataContent.includes('import { createUmi } from');
    
    verify('Metadata Script', 'UMI imports', hasUmiImports, 'Correct UMI imports ✅', 'Missing UMI imports ❌');
    verify('Metadata Script', 'Type compatibility', hasCorrectImports, 'UMI-compatible ✅', 'Has type conflicts ❌');
  } catch (e) {
    verify('Metadata Script', 'Analysis', false, '', 'Failed to analyze ❌');
  }

  // Print results
  console.log('\n📊 Verification Results:');
  console.log('========================');

  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    console.log(`\n${category}:`);
    const categoryResults = results.filter(r => r.category === category);
    
    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.item}: ${result.message}`);
    }
  }

  // Summary
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warning').length;

  console.log('\n📈 Summary:');
  console.log('===========');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All critical requirements met! Dream-Mind-Lucid AI Copilot is ready for deployment!');
    console.log('🚀 Run: npm run mainnet:copilot');
  } else {
    console.log('\n🛑 Some critical requirements are missing. Please address the failed items above.');
  }

  return failCount === 0;
}

if (require.main === module) {
  checkAllRequirements().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}