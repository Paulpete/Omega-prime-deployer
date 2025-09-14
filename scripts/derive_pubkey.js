#!/usr/bin/env node
// Small helper: derive public key from JSON secret array or base58 secret
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

function usage() {
  console.log('Usage: derive_pubkey.js <secretFile|secretString>');
  console.log(' - If argument is a file path, the file may contain a JSON array or base58 string');
  console.log(' - If argument looks like [1,2,3,..] it will be parsed as JSON array');
}

async function main() {
  const arg = process.argv[2];
  if (!arg) return usage();
  try {
    let raw = arg;
    if (fs.existsSync(arg)) raw = fs.readFileSync(arg, 'utf8').trim();
    // try json
    if (raw.startsWith('[')) {
      const arr = JSON.parse(raw);
      const kp = Keypair.fromSecretKey(Uint8Array.from(arr));
      console.log('PublicKey:', kp.publicKey.toBase58());
      return;
    }
    // try base58
    try {
      const sk = bs58.decode(raw);
      const kp = Keypair.fromSecretKey(Uint8Array.from(sk));
      console.log('PublicKey:', kp.publicKey.toBase58());
      return;
    } catch (e) {}
    console.error('Could not parse secret');
  } catch (e) {
    console.error('Error:', e.message || e);
  }
}

main();
