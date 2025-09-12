import { Keypair } from '@solana/web3.js';

import * as fs from 'fs';
import * as path from 'path';

export function loadOrCreateUserAuth(): Keypair {
	const cacheDir = path.join(process.cwd(), '.cache');
	const keypairPath = path.join(cacheDir, 'user_auth.json');
	
	if (fs.existsSync(keypairPath)) {
		try {
			const content = fs.readFileSync(keypairPath, 'utf-8').trim();
			if (content && content.length > 0) {
				const keypairJson = JSON.parse(content);
				if (Array.isArray(keypairJson) && keypairJson.length === 64) {
					return Keypair.fromSecretKey(Uint8Array.from(keypairJson));
				}
			}
			console.log('Invalid user auth file, generating new keypair');
		} catch (err) {
			console.log('Error reading user auth file, generating new keypair:', err instanceof Error ? err.message : String(err));
		}
	}
	
	const keypair = Keypair.generate();
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
	fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
	console.log(`Generated new USER_AUTH keypair: ${keypair.publicKey.toBase58()}`);
	return keypair;
}
