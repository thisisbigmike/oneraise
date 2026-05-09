/**
 * Cloak SDK integration for OneRaise Shield — private, compliant donations.
 *
 * Uses Cloak's shielded UTXO pool to hide donation amounts and identities
 * on-chain while keeping them auditable via viewing keys.
 *
 * @see https://docs.cloak.ag/sdk/introduction
 */

import {
  CLOAK_PROGRAM_ID,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  transact,
  scanTransactions,
  toComplianceReport,
} from "@cloak.dev/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getSolanaRpcUrl } from "@/lib/solana-payments";

/* ── Constants ── */

/** USDC mint on Solana mainnet */
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);

/** Re-export Cloak program ID for external use */
export { CLOAK_PROGRAM_ID };

/* ── Fee calculation ── */

/**
 * Estimate the Cloak protocol fee for a given gross amount.
 *
 * Formula (from docs): fee = 5_000_000 + floor(gross × 3 / 1000)
 * This is in the token's smallest unit (lamports for SOL, 1e-6 for USDC).
 */
export function estimateCloakFee(grossRaw: bigint): {
  fee: bigint;
  net: bigint;
  feePercent: string;
} {
  const baseFee = BigInt(5000000);
  const proportionalFee = (grossRaw * BigInt(3)) / BigInt(1000);
  const fee = baseFee + proportionalFee;
  const net = grossRaw - fee;
  const feePercent =
    grossRaw > BigInt(0)
      ? ((Number(fee) / Number(grossRaw)) * 100).toFixed(2)
      : "0.00";
  return { fee, net, feePercent };
}

/**
 * Convert a human-readable USDC amount to raw (6 decimals).
 */
export function usdcToRaw(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/**
 * Convert raw USDC amount to human-readable.
 */
export function rawToUsdc(raw: bigint): number {
  return Number(raw) / 1_000_000;
}

/* ── Cloak connection helper ── */

export function getCloakConnection(): Connection {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}

/* ── Viewing key utilities ── */

/**
 * Generate a new UTXO keypair and derive the viewing key (nk) from it.
 * The private key should be stored securely (encrypted in DB).
 * The nk is used for scanning transaction history.
 */
export async function generateViewingKeyMaterial(): Promise<{
  /** The UTXO keypair (owner of shielded notes) */
  utxoKeypair: Awaited<ReturnType<typeof generateUtxoKeypair>>;
  /** Hex-encoded private key for storage */
  privateKeyHex: string;
  /** The viewing key (nk) for scanning history */
  viewingKeyNk: Uint8Array;
}> {
  const utxoKeypair = await generateUtxoKeypair();
  const privateKeyHex = utxoKeypair.privateKey.toString(16).padStart(64, '0');
  const viewingKeyNk = getNkFromUtxoPrivateKey(utxoKeypair.privateKey);
  return { utxoKeypair, privateKeyHex, viewingKeyNk };
}

/* ── Transaction builders ── */

/**
 * Build a shielded USDC deposit + withdrawal transaction.
 *
 * Flow:
 * 1. Donor deposits USDC into the Cloak shielded pool
 * 2. Funds are immediately withdrawn to the campaign treasury
 *
 * The viewing key (nk) is embedded in the chain notes so the campaign
 * creator can later scan and verify the donation.
 */
export async function buildShieldedDonation(args: {
  /** Donor's wallet public key */
  donorPublicKey: PublicKey;
  /** Donor's wallet keypair (for signing — only on server if available) */
  donorKeypair?: Keypair;
  /** Campaign treasury wallet (where USDC ends up) */
  treasuryPublicKey: PublicKey;
  /** Donation amount in USDC (human-readable, e.g. 50 for $50) */
  amountUsdc: number;
}): Promise<{
  /** The viewing key material for this donation */
  viewingKey: Awaited<ReturnType<typeof generateViewingKeyMaterial>>;
  /** Fee estimate */
  feeEstimate: ReturnType<typeof estimateCloakFee>;
  /** UTXO keypair used */
  utxoKeypair: Awaited<ReturnType<typeof generateUtxoKeypair>>;
  /** Raw amount */
  amountRaw: bigint;
}> {
  const connection = getCloakConnection();
  const amountRaw = usdcToRaw(args.amountUsdc);
  const feeEstimate = estimateCloakFee(amountRaw);

  // Generate viewing key material for this donation
  const viewingKey = await generateViewingKeyMaterial();

  // Create the shielded UTXO
  const depositOutput = await createUtxo(
    amountRaw,
    viewingKey.utxoKeypair,
    USDC_MINT,
  );

  const baseOptions = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    walletPublicKey: args.donorPublicKey,
    chainNoteViewingKeyNk: viewingKey.viewingKeyNk,
    ...(args.donorKeypair ? { depositorKeypair: args.donorKeypair } : {}),
  };

  // Step 1: Deposit USDC into shielded pool
  const deposited = await transact(
    {
      inputUtxos: [await createZeroUtxo(USDC_MINT)],
      outputUtxos: [depositOutput],
      externalAmount: amountRaw,
      depositor: args.donorPublicKey,
    },
    baseOptions,
  );

  // Step 2: Withdraw from shielded pool to campaign treasury
  await fullWithdraw(deposited.outputUtxos, args.treasuryPublicKey, {
    ...baseOptions,
    cachedMerkleTree: deposited.merkleTree,
  });

  return {
    viewingKey,
    feeEstimate,
    utxoKeypair: viewingKey.utxoKeypair,
    amountRaw,
  };
}

/**
 * Execute a shielded USDC donation from the browser using a wallet adapter.
 */
export async function executeClientShieldedDonation(args: {
  /** Donor's wallet public key */
  donorPublicKey: PublicKey;
  /** Wallet signTransaction method */
  signTransaction: <T>(tx: T) => Promise<T>;
  /** Wallet signMessage method */
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
  /** Campaign treasury wallet (where USDC ends up) */
  treasuryPublicKey: PublicKey;
  /** Amount in raw units */
  amountRaw: bigint;
  /** Set status/progress callback */
  onProgress?: (status: string) => void;
}) {
  const connection = getCloakConnection();
  args.onProgress?.("Generating viewing key...");
  console.log("[Cloak] Generating viewing key...");
  let viewingKey;
  try {
    viewingKey = await generateViewingKeyMaterial();
  } catch (e: any) {
    console.error("[Cloak] Error in generateViewingKeyMaterial", e);
    throw e;
  }

  args.onProgress?.("Preparing shielded deposit...");
  console.log("[Cloak] Preparing shielded deposit output...");
  let depositOutput;
  try {
    depositOutput = await createUtxo(
      args.amountRaw,
      viewingKey.utxoKeypair,
      USDC_MINT,
    );
  } catch (e: any) {
    console.error("[Cloak] Error in createUtxo", e);
    throw e;
  }

  const baseOptions = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    walletPublicKey: args.donorPublicKey,
    depositorPublicKey: args.donorPublicKey,
    signTransaction: args.signTransaction,
    chainNoteViewingKeyNk: viewingKey.viewingKeyNk,
  };

  args.onProgress?.("Please approve the deposit in your wallet.");
  console.log("[Cloak] Creating zero utxo...");
  let zeroUtxo;
  try {
    zeroUtxo = await createZeroUtxo(USDC_MINT);
  } catch (e: any) {
    console.error("[Cloak] Error in createZeroUtxo", e);
    throw e;
  }

  console.log("[Cloak] Calling transact...");
  let deposited;
  try {
    deposited = await transact(
      {
        inputUtxos: [zeroUtxo],
        outputUtxos: [depositOutput],
        externalAmount: args.amountRaw,
        depositor: args.donorPublicKey,
      },
      {
        ...baseOptions,
        onProgress: (s: string) => args.onProgress?.(`Deposit: ${s}`),
        onProofProgress: (p: number) => args.onProgress?.(`Generating proof: ${typeof p === 'number' ? Math.round(p * 100) : p}%`),
      },
    );
  } catch (e: any) {
    console.error("[Cloak] Error in transact", e);
    throw e;
  }

  args.onProgress?.("Deposit successful! Preparing withdrawal...");
  console.log("[Cloak] Calling fullWithdraw...");
  let withdrawResult;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      args.onProgress?.(attempt > 1 ? `Please approve the withdrawal (attempt ${attempt}/3)...` : "Please approve the withdrawal in your wallet.");
      withdrawResult = await fullWithdraw(deposited.outputUtxos, args.treasuryPublicKey, {
        ...baseOptions,
        signMessage: args.signMessage,
        cachedMerkleTree: deposited.merkleTree,
        onProgress: (s: string) => args.onProgress?.(`Withdrawal: ${s}`),
        onProofProgress: (p: number) => args.onProgress?.(`Generating proof: ${typeof p === 'number' ? Math.round(p * 100) : p}%`),
      });
      break;
    } catch (error: any) {
      if (!error?.message?.includes("RootNotFound") || attempt === 3) {
        console.error("[Cloak] Error in fullWithdraw", error);
        throw error;
      }
      args.onProgress?.("Stale root detected. Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (!withdrawResult) throw new Error("Withdrawal did not produce a result.");

  return {
    depositSignature: deposited.signature,
    withdrawSignature: withdrawResult.signature,
    viewingKeyHex: Buffer.from(viewingKey.viewingKeyNk).toString("hex"),
  };
}

/* ── Compliance scanning ── */

/**
 * Scan Cloak transaction history using a viewing key.
 * Returns a compliance report with gross/fee/net per transaction.
 */
export async function scanCloakHistory(args: {
  /** The viewing key (nk) to use for decryption */
  viewingKeyNk: Uint8Array;
  /** Max transactions to scan */
  limit?: number;
}): Promise<{
  report: ReturnType<typeof toComplianceReport>;
  rawScan: Awaited<ReturnType<typeof scanTransactions>>;
}> {
  const connection = getCloakConnection();

  const rawScan = await scanTransactions({
    connection,
    programId: CLOAK_PROGRAM_ID,
    viewingKeyNk: args.viewingKeyNk,
    limit: args.limit ?? 250,
  });

  const report = toComplianceReport(rawScan);
  return { report, rawScan };
}
