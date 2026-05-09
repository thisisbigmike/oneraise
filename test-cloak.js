const { transact, createUtxo, createZeroUtxo, generateUtxoKeypair, CLOAK_PROGRAM_ID } = require('@cloak.dev/sdk');
const { PublicKey, Connection } = require('@solana/web3.js');

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const kp = await generateUtxoKeypair();
  const amountRaw = 50000000n; // 50 USDC
  
  const depositOutput = await createUtxo(amountRaw, kp, USDC_MINT);
  const zeroUtxo = await createZeroUtxo(USDC_MINT);
  
  console.log("Calling transact...");
  try {
    await transact(
      {
        inputUtxos: [zeroUtxo],
        outputUtxos: [depositOutput],
        externalAmount: amountRaw,
        depositor: new PublicKey("11111111111111111111111111111111"),
      },
      {
        connection,
        programId: CLOAK_PROGRAM_ID,
        walletPublicKey: new PublicKey("11111111111111111111111111111111"),
        depositorPublicKey: new PublicKey("11111111111111111111111111111111"),
        signTransaction: async (tx) => tx, // mock sign
        chainNoteViewingKeyNk: new Uint8Array(32),
      }
    );
  } catch (e) {
    console.error("TRANSACT ERROR:", e);
  }
}

main().catch(console.error);
