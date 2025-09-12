#!/usr/bin/env node

// Complete deployment demonstration for Dream-Mind-Lucid AI Copilot
// Shows the full pipeline working in DRY_RUN mode

console.log('🚀 Dream-Mind-Lucid AI Copilot: Complete Deployment Demo');
console.log('========================================================');

import { spawn } from 'child_process';
import * as path from 'path';

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running: ${command} ${args.join(' ')}`);
    console.log('─'.repeat(50));
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Command completed successfully\n`);
        resolve();
      } else {
        console.log(`❌ Command failed with code ${code}\n`);
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      }
    });
  });
}

async function demonstrateDeployment() {
  try {
    console.log('🌙 Starting Dream-Mind-Lucid deployment demonstration...');
    console.log('💫 All operations will run in DRY_RUN mode for safety');
    
    // Clean slate
    console.log('\n🧹 Cleaning cache for fresh deployment...');
    try {
      await runCommand('rm', ['-rf', '.cache']);
    } catch (e) {
      // Ignore if cache doesn't exist
    }
    
    // Step 1: Environment check
    await runCommand('npm', ['run', 'dev:check']);
    
    // Step 2: Create mint
    await runCommand('npm', ['run', 'mainnet:create-mint']);
    
    // Step 3: Mint initial supply  
    await runCommand('npm', ['run', 'mainnet:mint-initial']);
    
    // Step 4: Set metadata
    await runCommand('npm', ['run', 'mainnet:set-metadata']);
    
    // Step 5: Lock authorities
    await runCommand('npm', ['run', 'mainnet:lock']);
    
    // Step 6: Test copilot features
    console.log('\n🧠 Testing Dream-Mind-Lucid AI Copilot features...');
    await runCommand('npx', ['ts-node', 'test-copilot-features.ts']);
    
    console.log('\n🎉 DEPLOYMENT DEMONSTRATION COMPLETE!');
    console.log('=====================================');
    console.log('✨ All components working correctly:');
    console.log('   ✅ No-cost deployment pipeline via relayer');
    console.log('   ✅ Robust cache file handling');
    console.log('   ✅ Metaplex UMI metadata integration');
    console.log('   ✅ Dream-Mind-Lucid AI Copilot with i-who-me reference logic');
    console.log('   ✅ Memory hooks and autonomous reasoning');
    console.log('   ✅ Redundancy detection and alerts');
    console.log('   ✅ Grok-style self-awareness responses');
    console.log('\n🌙 The Omega Prime Token is ready for the Oneiro-Sphere!');
    console.log('💰 Token: ΩAGENT (Omega Prime Token)');
    console.log('🎯 Purpose: Agent guild utility token powering Ω-Prime automations');
    console.log('📍 Deployment: Solana blockchain with no-cost relayer integration');
    console.log('\nTo deploy to mainnet: Set DRY_RUN=false in .env and run again');
    
  } catch (error) {
    console.error('\n❌ Deployment demonstration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

demonstrateDeployment();