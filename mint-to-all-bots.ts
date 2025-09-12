// mint-to-all-bots.ts
// Mints 1 token to each bot address using the relayer for fee payment

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { sendViaRelayer } from './src/utils/relayer';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const BOT_ADDRESSES = [
  'HKBJoeUWH6pUQuLd9CZWrJBzGSE9roEW4bshnxd9AHsR',
  'NqGHDaaLWmND7uShuaZkVbGNQFy6pS96qHyfR3pGR2d',
  'DbhKvqweZECTyYQ7PRJoHmKt8f262fsBCGHxSaD5BPqA',
  '7uSCVM1MJPKctrSRzuFN7qfVoJX78q6V5q5JuzRPaK41',
  '3oFCkoneQShDsJMZYscXew4jGwgLjpxfykHuGo85QyLw',
];

const MINT_PATH = path.join(process.cwd(), '.cache', 'mint.json');
const USER_AUTH_PATH = path.join(process.cwd(), '.cache', 'user_auth.json');

async function main() {
  if (!fs.existsSync(MINT_PATH)) throw new Error('Mint file missing');
  if (!fs.existsSync(USER_AUTH_PATH)) throw new Error('User auth file missing');
  const mintKey = JSON.parse(fs.readFileSync(MINT_PATH, 'utf-8'));
  const mint = new PublicKey(mintKey);
  const userKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(USER_AUTH_PATH, 'utf-8'))));

  const connection = new Connection(process.env.RPC_URL!, 'confirmed');
  const relayerPubkey = process.env.RELAYER_PUBKEY!;
  const relayerUrl = process.env.RELAYER_URL!;

  // Get user's associated token account (ATA)
  const userATA = await getAssociatedTokenAddress(mint, userKeypair.publicKey);

  for (const bot of BOT_ADDRESSES) {
    const botPubkey = new PublicKey(bot);
    const botATA = await getAssociatedTokenAddress(mint, botPubkey);
    const ix: any[] = [];
    // Check if bot ATA exists
    const botATAInfo = await connection.getAccountInfo(botATA);
    if (!botATAInfo) {
      ix.push(createAssociatedTokenAccountInstruction(userKeypair.publicKey, botATA, botPubkey, mint));
    }
    // Transfer 1 token (assume mint has 0 decimals)
    ix.push(createTransferInstruction(userATA, botATA, userKeypair.publicKey, 1));
    const tx = new Transaction().add(...ix);
    tx.feePayer = new PublicKey(relayerPubkey);
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    tx.sign(userKeypair);
    try {
      const sig = await sendViaRelayer(connection, relayerPubkey, relayerUrl, tx);
      console.log(`Minted 1 token to ${bot} | Tx: https://explorer.solana.com/tx/${sig}`);
    } catch (e) {
      console.error(`Failed to mint to ${bot}:`, e);
    }
  }
}

main().catch(console.error);
