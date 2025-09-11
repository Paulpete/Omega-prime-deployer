const web3 = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ANSI colors for better output formatting
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class SimpleDeploymentControlAnalyzer {
  constructor() {
    this.availableKeypairs = new Map();
    this.loadKeypairs();
  }

  loadKeypairs() {
    console.log(`${colors.cyan}🔑 Loading available keypairs...${colors.reset}`);
    
    // Load user auth keypair
    const userAuthPath = path.join(__dirname, '.cache/user_auth.json');
    if (fs.existsSync(userAuthPath)) {
      try {
        const userAuthData = JSON.parse(fs.readFileSync(userAuthPath, 'utf-8'));
        const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(userAuthData));
        this.availableKeypairs.set(keypair.publicKey.toBase58(), {
          keypair,
          source: 'user_auth.json',
          type: 'deployment_auth',
          role: 'Local deployment authority'
        });
        console.log(`  ✅ User Auth: ${keypair.publicKey.toBase58()}`);
      } catch (e) {
        console.log(`  ❌ Failed to load user auth: ${e.message}`);
      }
    }

    // Load mint keypair if exists
    const mintPath = path.join(__dirname, '.cache/mint.json');
    if (fs.existsSync(mintPath)) {
      try {
        const mintData = JSON.parse(fs.readFileSync(mintPath, 'utf-8'));
        console.log(`  ℹ️  Mint address from cache: ${mintData.mint}`);
      } catch (e) {
        console.log(`  ❌ Failed to read mint cache: ${e.message}`);
      }
    }

    // Check for other possible keypair files
    const possibleKeyFiles = [
      'keypair.json',
      'authority.json',
      'deployer.json',
      'master-controller.json',
      'bot-controller.json'
    ];

    for (const keyFile of possibleKeyFiles) {
      const fullPath = path.join(__dirname, keyFile);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          if (Array.isArray(data) && data.length === 64) {
            // Direct keypair array
            const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(data));
            this.availableKeypairs.set(keypair.publicKey.toBase58(), {
              keypair,
              source: keyFile,
              type: 'authority_keypair',
              role: 'Authority keypair'
            });
            console.log(`  ✅ ${keyFile}: ${keypair.publicKey.toBase58()}`);
          }
        } catch (e) {
          // Ignore files that aren't keypairs
        }
      }
    }

    console.log(`${colors.cyan}Found ${this.availableKeypairs.size} available keypairs${colors.reset}\n`);
  }

  analyzeLocalControl() {
    console.log(`${colors.bold}${colors.magenta}🔍 OMEGA PRIME DEPLOYMENT CONTROL ANALYSIS (OFFLINE MODE)${colors.reset}\n`);
    
    // Load contract addresses
    const addressesPath = path.join(__dirname, 'contract_addresses.json');
    if (!fs.existsSync(addressesPath)) {
      console.log(`${colors.red}❌ contract_addresses.json not found${colors.reset}`);
      return;
    }

    const addressesData = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
    const addresses = addressesData.omega_prime_addresses;

    console.log(`${colors.cyan}📊 Analyzing control based on available keypairs...${colors.reset}\n`);

    // Create a map of all addresses for quick lookup
    const allAddresses = new Set(addresses.all_addresses_list);
    
    console.log(`${colors.bold}🔑 YOUR KEYPAIRS VS CONTRACT ADDRESSES${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

    let controlledAddresses = [];
    let uncontrolledAddresses = [];

    // Check each category
    this.analyzeCategory("🤖 BOT ARMY", addresses.bot_army, allAddresses, controlledAddresses, uncontrolledAddresses);
    this.analyzeCategory("🎮 CONTROL ADDRESSES", addresses.control_addresses, allAddresses, controlledAddresses, uncontrolledAddresses);
    this.analyzeCategory("💰 TREASURY & OPERATIONAL", addresses.treasury_operational, allAddresses, controlledAddresses, uncontrolledAddresses);
    this.analyzeCategory("🪙 TOKEN ADDRESSES", addresses.token_addresses, allAddresses, controlledAddresses, uncontrolledAddresses);
    this.analyzeCategory("🔍 ANALYSIS ADDRESSES", addresses.analysis_addresses, allAddresses, controlledAddresses, uncontrolledAddresses);

    this.printSummary(controlledAddresses, uncontrolledAddresses, addresses);
  }

  analyzeCategory(categoryName, categoryData, allAddresses, controlledAddresses, uncontrolledAddresses) {
    console.log(`${colors.bold}${categoryName}${colors.reset}`);
    
    for (const [name, data] of Object.entries(categoryData)) {
      if (typeof data === 'object' && data.address) {
        // Single address object
        this.checkAddressControl(name, data.address, controlledAddresses, uncontrolledAddresses);
      } else if (typeof data === 'object') {
        // Object with multiple addresses
        for (const [subName, subData] of Object.entries(data)) {
          if (typeof subData === 'string' && subData.length > 30) {
            // This looks like an address
            this.checkAddressControl(`${name}_${subName}`, subData, controlledAddresses, uncontrolledAddresses);
          } else if (typeof subData === 'object' && subData.bot_address) {
            // Bot object with multiple addresses
            this.checkAddressControl(`${subName}_bot`, subData.bot_address, controlledAddresses, uncontrolledAddresses);
            this.checkAddressControl(`${subName}_contract`, subData.contract_address, controlledAddresses, uncontrolledAddresses);
          }
        }
      } else if (typeof data === 'string' && data.length > 30) {
        // Direct address string
        this.checkAddressControl(name, data, controlledAddresses, uncontrolledAddresses);
      }
    }
    console.log();
  }

  checkAddressControl(name, address, controlledAddresses, uncontrolledAddresses) {
    const controlled = this.availableKeypairs.has(address);
    const icon = controlled ? '✅' : '❌';
    const color = controlled ? colors.green : colors.red;
    
    console.log(`  ${icon} ${color}${name}${colors.reset}: ${address}`);
    
    if (controlled) {
      const keyInfo = this.availableKeypairs.get(address);
      console.log(`    🔑 Controlled via: ${keyInfo.source} (${keyInfo.role})`);
      controlledAddresses.push({ name, address, keyInfo });
    } else {
      uncontrolledAddresses.push({ name, address });
    }
  }

  printSummary(controlledAddresses, uncontrolledAddresses, addresses) {
    console.log(`${colors.bold}${colors.cyan}📋 DEPLOYMENT CONTROL SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.bold}🔑 Available Keypairs: ${this.availableKeypairs.size}${colors.reset}`);
    for (const [address, keyInfo] of this.availableKeypairs) {
      console.log(`  • ${address}`);
      console.log(`    Source: ${keyInfo.source}`);
      console.log(`    Role: ${keyInfo.role}`);
    }

    console.log(`\n${colors.bold}✅ Controlled Addresses: ${controlledAddresses.length}${colors.reset}`);
    if (controlledAddresses.length === 0) {
      console.log(`  ${colors.yellow}No addresses directly controlled by available keypairs${colors.reset}`);
    } else {
      for (const item of controlledAddresses) {
        console.log(`  • ${item.name}: ${item.address}`);
        console.log(`    via ${item.keyInfo.source}`);
      }
    }

    console.log(`\n${colors.bold}❌ Uncontrolled Addresses: ${uncontrolledAddresses.length}${colors.reset}`);
    console.log(`  ${colors.yellow}These addresses require their respective private keys for control${colors.reset}`);

    console.log(`\n${colors.bold}🎯 WHAT YOU CONTROL (SUMMARY):${colors.reset}`);
    
    if (controlledAddresses.length === 0) {
      console.log(`  ${colors.red}❌ NO DIRECT CONTROL${colors.reset}`);
      console.log(`  ${colors.yellow}⚠️  You have deployment keypairs but they don't match any listed contract addresses${colors.reset}`);
      console.log(`  ${colors.cyan}ℹ️  This means:${colors.reset}`);
      console.log(`    - You can deploy NEW contracts with your current keypairs`);
      console.log(`    - You cannot control the EXISTING contracts listed in contract_addresses.json`);
      console.log(`    - You need the private keys for the specific contract addresses to control them`);
    } else {
      console.log(`  ${colors.green}✅ DIRECT CONTROL of ${controlledAddresses.length} address(es)${colors.reset}`);
      console.log(`  ${colors.cyan}ℹ️  You can control these addresses directly${colors.reset}`);
    }

    // Special analysis for key addresses
    console.log(`\n${colors.bold}🔍 KEY ADDRESS ANALYSIS:${colors.reset}`);
    
    const masterController = addresses.control_addresses?.creator_master_controller?.address;
    if (masterController) {
      const controlled = this.availableKeypairs.has(masterController);
      console.log(`  Master Controller (${masterController}): ${controlled ? colors.green + 'CONTROLLED' + colors.reset : colors.red + 'NOT CONTROLLED' + colors.reset}`);
    }

    const treasury = addresses.treasury_operational?.treasury_address;
    if (treasury) {
      const controlled = this.availableKeypairs.has(treasury);
      console.log(`  Treasury (${treasury}): ${controlled ? colors.green + 'CONTROLLED' + colors.reset : colors.red + 'NOT CONTROLLED' + colors.reset}`);
    }

    console.log(`\n${colors.bold}💡 NEXT STEPS:${colors.reset}`);
    console.log(`  1. ${colors.cyan}For NEW deployments:${colors.reset} Use your current keypairs to deploy new contracts`);
    console.log(`  2. ${colors.cyan}For EXISTING contracts:${colors.reset} You need the specific private keys for each address`);
    console.log(`  3. ${colors.cyan}Master Controller:${colors.reset} ${masterController ? 
      (this.availableKeypairs.has(masterController) ? 'You control it!' : 'You need its private key') : 'Not defined'}`);
    console.log(`  4. ${colors.cyan}To gain control:${colors.reset} Import the correct private keys into your keychain`);
    console.log(`  5. ${colors.cyan}Network check:${colors.reset} Run online analysis when network is available`);

    // Show what the current keypair can be used for
    if (this.availableKeypairs.size > 0) {
      console.log(`\n${colors.bold}🛠️ WHAT YOUR CURRENT KEYPAIRS CAN DO:${colors.reset}`);
      for (const [address, keyInfo] of this.availableKeypairs) {
        console.log(`  • ${address} (${keyInfo.source}):`);
        console.log(`    - Deploy new Solana programs`);
        console.log(`    - Create new token mints`);
        console.log(`    - Sign transactions as this identity`);
        console.log(`    - Act as program upgrade authority for new deployments`);
      }
    }
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new SimpleDeploymentControlAnalyzer();
  analyzer.analyzeLocalControl();
}

module.exports = SimpleDeploymentControlAnalyzer;