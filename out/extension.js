"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
// Simulated deployment logic (replace with actual integration)
async function runFullDeployment() {
    // Simulate each step
    await new Promise(res => setTimeout(res, 500)); // Create Mint
    await new Promise(res => setTimeout(res, 500)); // Mint Initial Supply
    await new Promise(res => setTimeout(res, 500)); // Set Metadata
    await new Promise(res => setTimeout(res, 500)); // Lock Authorities
    // Simulate contract address
    const mintAddress = 'So1anaMintAddressExample1234567890';
    return mintAddress;
}
function activate(context) {
    vscode.window.showInformationMessage('Omega Prime Token Deployer extension activated!');
    // Register deployment commands
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:CreateMint', () => {
        vscode.window.showInformationMessage('Create Mint command executed.');
        // TODO: Integrate mint creation logic
    }));
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:MintInitialSupply', () => {
        vscode.window.showInformationMessage('Mint Initial Supply command executed.');
        // TODO: Integrate mint initial supply logic
    }));
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:SetMetadata', () => {
        vscode.window.showInformationMessage('Set Metadata command executed.');
        // TODO: Integrate set metadata logic
    }));
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:LockAuthorities', () => {
        vscode.window.showInformationMessage('Lock Authorities command executed.');
        // TODO: Integrate lock authorities logic
    }));
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:Rollback', () => {
        vscode.window.showInformationMessage('Rollback command executed.');
        // TODO: Integrate rollback logic
    }));
    // Full deployment command
    context.subscriptions.push(vscode.commands.registerCommand('OmegaPrime:RunFullDeployment', async () => {
        vscode.window.showInformationMessage('Running full deployment...');
        const mintAddress = await runFullDeployment();
        vscode.window.showInformationMessage(`Deployment complete! Contract (mint) address: ${mintAddress}`);
    }));
}
function deactivate() { }
