const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');
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

class DeploymentControlAnalyzer {
  constructor() {
    this.connection = new web3.Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'),
      'confirmed'
    );
    this.controlledDeployments = [];
    this.uncontrolledDeployments = [];
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
          type: 'deployment_auth'
        });
        console.log(`  ✅ User Auth: ${keypair.publicKey.toBase58()}`);
      } catch (e) {
        console.log(`  ❌ Failed to load user auth: ${e.message}`);
      }
    }

    // Check for other possible keypair files
    const possibleKeyFiles = [
      '.cache/mint.json',
      'keypair.json',
      'authority.json',
      'deployer.json'
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
              type: 'direct_keypair'
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

  async analyzeContractControl(address, name, category) {
    try {
      const pubkey = new web3.PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(pubkey);
      
      if (!accountInfo) {
        return {
          address,
          name,
          category,
          status: 'not_found',
          controlled: false,
          reason: 'Account not found on mainnet'
        };
      }

      const analysis = {
        address,
        name,
        category,
        status: 'found',
        executable: accountInfo.executable,
        owner: accountInfo.owner.toBase58(),
        balance: accountInfo.lamports / web3.LAMPORTS_PER_SOL,
        controlled: false,
        authorities: [],
        reason: ''
      };

      // Check if we own this account directly
      if (this.availableKeypairs.has(address)) {
        analysis.controlled = true;
        analysis.reason = 'Direct keypair ownership';
        analysis.controlType = 'direct_ownership';
        return analysis;
      }

      // Analyze based on account type
      if (accountInfo.executable) {
        await this.analyzeProgramControl(analysis, accountInfo, pubkey);
      } else if (accountInfo.owner.equals(spl.TOKEN_PROGRAM_ID) || accountInfo.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
        await this.analyzeTokenControl(analysis, accountInfo, pubkey);
      } else {
        await this.analyzeAccountControl(analysis, accountInfo, pubkey);
      }

      return analysis;
    } catch (error) {
      return {
        address,
        name,
        category,
        status: 'error',
        controlled: false,
        reason: `Analysis failed: ${error.message}`
      };
    }
  }

  async analyzeProgramControl(analysis, accountInfo, pubkey) {
    analysis.type = 'program';
    
    // Check if it's an upgradeable program
    if (accountInfo.owner.equals(new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))) {
      try {
        // Get program data account
        const programDataKey = new web3.PublicKey(accountInfo.data.slice(4, 36));
        const programData = await this.connection.getAccountInfo(programDataKey);
        
        if (programData && programData.data.length > 45) {
          const upgradeAuthPresent = programData.data[12];
          if (upgradeAuthPresent === 1) {
            const upgradeAuthority = new web3.PublicKey(programData.data.slice(13, 45));
            analysis.authorities.push({
              type: 'upgrade_authority',
              address: upgradeAuthority.toBase58()
            });
            
            if (this.availableKeypairs.has(upgradeAuthority.toBase58())) {
              analysis.controlled = true;
              analysis.reason = 'We control the upgrade authority';
              analysis.controlType = 'upgrade_authority';
            }
          } else {
            analysis.authorities.push({
              type: 'upgrade_authority',
              address: 'null (renounced)'
            });
            analysis.reason = 'Upgrade authority renounced - immutable program';
          }
        }
      } catch (e) {
        analysis.reason = 'Could not parse program data';
      }
    } else {
      analysis.reason = 'Non-upgradeable program - no control possible';
    }
  }

  async analyzeTokenControl(analysis, accountInfo, pubkey) {
    analysis.type = 'token_mint';
    
    try {
      const mintInfo = await spl.getMint(this.connection, pubkey, 'confirmed', 
        accountInfo.owner.equals(spl.TOKEN_2022_PROGRAM_ID) ? spl.TOKEN_2022_PROGRAM_ID : spl.TOKEN_PROGRAM_ID);
      
      analysis.supply = mintInfo.supply.toString();
      analysis.decimals = mintInfo.decimals;

      // Check mint authority
      if (mintInfo.mintAuthority) {
        analysis.authorities.push({
          type: 'mint_authority',
          address: mintInfo.mintAuthority.toBase58()
        });
        
        if (this.availableKeypairs.has(mintInfo.mintAuthority.toBase58())) {
          analysis.controlled = true;
          analysis.reason = 'We control the mint authority';
          analysis.controlType = 'mint_authority';
        }
      } else {
        analysis.authorities.push({
          type: 'mint_authority',
          address: 'null (renounced)'
        });
      }

      // Check freeze authority
      if (mintInfo.freezeAuthority) {
        analysis.authorities.push({
          type: 'freeze_authority',
          address: mintInfo.freezeAuthority.toBase58()
        });
        
        if (this.availableKeypairs.has(mintInfo.freezeAuthority.toBase58()) && !analysis.controlled) {
          analysis.controlled = true;
          analysis.reason = 'We control the freeze authority';
          analysis.controlType = 'freeze_authority';
        }
      } else {
        analysis.authorities.push({
          type: 'freeze_authority',
          address: 'null (renounced)'
        });
      }

      if (!analysis.controlled) {
        analysis.reason = 'No control over mint or freeze authorities';
      }
    } catch (e) {
      analysis.reason = `Token analysis failed: ${e.message}`;
    }
  }

  async analyzeAccountControl(analysis, accountInfo, pubkey) {
    analysis.type = 'account';
    
    // For regular accounts, check if it's a program-derived account or if we own it
    if (this.availableKeypairs.has(analysis.address)) {
      analysis.controlled = true;
      analysis.reason = 'Direct account ownership';
      analysis.controlType = 'direct_ownership';
    } else {
      analysis.reason = 'Regular account - no control without private key';
    }
  }

  async runAnalysis() {
    console.log(`${colors.bold}${colors.magenta}🔍 OMEGA PRIME DEPLOYMENT CONTROL ANALYSIS${colors.reset}\n`);
    
    // Load contract addresses
    const addressesPath = path.join(__dirname, 'contract_addresses.json');
    if (!fs.existsSync(addressesPath)) {
      console.log(`${colors.red}❌ contract_addresses.json not found${colors.reset}`);
      return;
    }

    const addressesData = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
    const addresses = addressesData.omega_prime_addresses;

    console.log(`${colors.cyan}📊 Analyzing ${addresses.all_addresses_list.length} addresses...${colors.reset}\n`);

    // Analyze bot army
    console.log(`${colors.bold}🤖 BOT ARMY ANALYSIS${colors.reset}`);
    for (const [botName, botData] of Object.entries(addresses.bot_army)) {
      console.log(`\n${colors.yellow}--- ${botName.toUpperCase()} ---${colors.reset}`);
      
      // Analyze bot address
      const botAnalysis = await this.analyzeContractControl(
        botData.bot_address, 
        `${botName}_bot`, 
        'bot_wallet'
      );
      this.printAnalysis(botAnalysis);
      
      // Analyze contract address
      const contractAnalysis = await this.analyzeContractControl(
        botData.contract_address, 
        `${botName}_contract`, 
        'bot_contract'
      );
      this.printAnalysis(contractAnalysis);

      if (botAnalysis.controlled || contractAnalysis.controlled) {
        this.controlledDeployments.push({ botName, botAnalysis, contractAnalysis });
      } else {
        this.uncontrolledDeployments.push({ botName, botAnalysis, contractAnalysis });
      }
    }

    // Analyze control addresses
    console.log(`\n${colors.bold}🎮 CONTROL ADDRESSES${colors.reset}`);
    for (const [controlName, controlData] of Object.entries(addresses.control_addresses)) {
      console.log(`\n${colors.yellow}--- ${controlName.toUpperCase()} ---${colors.reset}`);
      const analysis = await this.analyzeContractControl(
        controlData.address, 
        controlName, 
        'control'
      );
      this.printAnalysis(analysis);
    }

    // Analyze core programs
    console.log(`\n${colors.bold}⚙️ CORE PROGRAMS${colors.reset}`);
    for (const [programName, programAddress] of Object.entries(addresses.program_ids.solana_core)) {
      console.log(`\n${colors.yellow}--- ${programName.toUpperCase()} ---${colors.reset}`);
      const analysis = await this.analyzeContractControl(
        programAddress, 
        programName, 
        'core_program'
      );
      this.printAnalysis(analysis);
    }

    // Print summary
    this.printSummary();
  }

  printAnalysis(analysis) {
    const statusColor = analysis.controlled ? colors.green : 
                       analysis.status === 'found' ? colors.yellow : colors.red;
    const controlIcon = analysis.controlled ? '✅' : '❌';
    
    console.log(`  ${controlIcon} ${statusColor}${analysis.name}${colors.reset}`);
    console.log(`    Address: ${analysis.address}`);
    console.log(`    Status: ${analysis.status}`);
    
    if (analysis.status === 'found') {
      console.log(`    Type: ${analysis.type || 'unknown'}`);
      console.log(`    Balance: ${analysis.balance} SOL`);
      console.log(`    Controlled: ${analysis.controlled ? colors.green + 'YES' + colors.reset : colors.red + 'NO' + colors.reset}`);
      console.log(`    Reason: ${analysis.reason}`);
      
      if (analysis.authorities && analysis.authorities.length > 0) {
        console.log(`    Authorities:`);
        for (const auth of analysis.authorities) {
          const authControlled = this.availableKeypairs.has(auth.address);
          const authIcon = authControlled ? '🔑' : '🔒';
          console.log(`      ${authIcon} ${auth.type}: ${auth.address}`);
        }
      }
    } else {
      console.log(`    Reason: ${analysis.reason}`);
    }
  }

  printSummary() {
    console.log(`\n${colors.bold}${colors.cyan}📋 DEPLOYMENT CONTROL SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.bold}🔑 Available Keypairs: ${this.availableKeypairs.size}${colors.reset}`);
    for (const [address, keyInfo] of this.availableKeypairs) {
      console.log(`  • ${address} (${keyInfo.source})`);
    }

    console.log(`\n${colors.bold}✅ Controlled Deployments: ${this.controlledDeployments.length}${colors.reset}`);
    for (const deployment of this.controlledDeployments) {
      console.log(`  • ${deployment.botName}`);
      if (deployment.botAnalysis.controlled) {
        console.log(`    - Bot wallet: ${deployment.botAnalysis.controlType}`);
      }
      if (deployment.contractAnalysis.controlled) {
        console.log(`    - Contract: ${deployment.contractAnalysis.controlType}`);
      }
    }

    console.log(`\n${colors.bold}❌ Uncontrolled Deployments: ${this.uncontrolledDeployments.length}${colors.reset}`);
    for (const deployment of this.uncontrolledDeployments) {
      console.log(`  • ${deployment.botName} - ${deployment.botAnalysis.reason || deployment.contractAnalysis.reason}`);
    }

    console.log(`\n${colors.bold}🎯 WHAT YOU CONTROL:${colors.reset}`);
    if (this.controlledDeployments.length === 0) {
      console.log(`  ${colors.red}❌ No deployments under your control${colors.reset}`);
      console.log(`  ${colors.yellow}⚠️  You have deployment keypairs but no upgrade/mint authorities${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✅ ${this.controlledDeployments.length} deployment(s) under your control${colors.reset}`);
    }

    console.log(`\n${colors.bold}💡 NEXT STEPS:${colors.reset}`);
    console.log(`  1. Review controlled deployments above`);
    console.log(`  2. For uncontrolled deployments, you need the appropriate authority keypairs`);
    console.log(`  3. Consider transferring authorities to your current keypairs if needed`);
    console.log(`  4. Use 'npm run verify:addresses' for detailed verification reports`);
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new DeploymentControlAnalyzer();
  analyzer.runAnalysis().catch(console.error);
}

module.exports = DeploymentControlAnalyzer;