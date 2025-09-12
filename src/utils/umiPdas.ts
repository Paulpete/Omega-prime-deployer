import { PublicKey as UmiPublicKey, Umi } from '@metaplex-foundation/umi';
import { findMetadataPda as umiMdPda } from '@metaplex-foundation/mpl-token-metadata';

/**
 * UMI-compatible PDA utilities for Metaplex operations
 */

export function findMetadataPda(umi: Umi, params: { mint: UmiPublicKey }): [UmiPublicKey, number] {
  return umiMdPda(umi, params);
}

export function findAssociatedTokenPda(umi: Umi, params: { owner: UmiPublicKey; mint: UmiPublicKey }): [UmiPublicKey, number] {
  // For UMI, you would typically use a different approach for ATA
  // This is a placeholder implementation - actual implementation would depend on specific UMI utilities
  const seeds = [
    params.owner,
    umi.programs.get('splToken').publicKey,
    params.mint
  ];
  
  return umi.eddsa.findPda(umi.programs.get('splAssociatedToken').publicKey, seeds);
}