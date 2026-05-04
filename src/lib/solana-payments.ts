import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import prisma from "@/lib/prisma";
import { JUPITER_USDC } from "@/lib/jupiter";

export const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export type JupiterInstructionPayload = {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string;
};

export type JupiterSwapInstructions = {
  tokenLedgerInstruction?: JupiterInstructionPayload | null;
  computeBudgetInstructions?: JupiterInstructionPayload[];
  setupInstructions?: JupiterInstructionPayload[];
  swapInstruction?: JupiterInstructionPayload;
  cleanupInstruction?: JupiterInstructionPayload | null;
  otherInstructions?: JupiterInstructionPayload[];
  addressLookupTableAddresses?: string[];
  error?: string;
};

export type JupiterTreasury = {
  owner: PublicKey;
  usdcTokenAccount: PublicKey;
  source: string;
};

export function getSolanaRpcUrl() {
  return process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || SOLANA_MAINNET_RPC;
}

export function getSolanaConnection() {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}

export function getUsdcMintPublicKey() {
  return new PublicKey(JUPITER_USDC.mint);
}

export function getUsdcAta(owner: PublicKey) {
  return getAssociatedTokenAddressSync(
    getUsdcMintPublicKey(),
    owner,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function deserializeJupiterInstruction(payload: JupiterInstructionPayload) {
  return new TransactionInstruction({
    programId: new PublicKey(payload.programId),
    keys: payload.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(payload.data, "base64"),
  });
}

export async function getAddressLookupTableAccounts(
  connection: Connection,
  addresses: string[] = [],
) {
  if (!addresses.length) return [];

  const accountInfos = await connection.getMultipleAccountsInfo(
    addresses.map((address) => new PublicKey(address)),
  );

  return accountInfos.reduce<AddressLookupTableAccount[]>((accounts, accountInfo, index) => {
    if (!accountInfo) return accounts;

    accounts.push(
      new AddressLookupTableAccount({
        key: new PublicKey(addresses[index]),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      }),
    );

    return accounts;
  }, []);
}

export async function resolveJupiterTreasury(campaignSlug: string): Promise<JupiterTreasury> {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: campaignSlug },
    select: {
      userId: true,
    },
  });

  const payoutMethod = campaign?.userId
    ? await prisma.payoutMethod.findFirst({
        where: {
          userId: campaign.userId,
          type: "crypto",
          walletAddress: { not: null },
          OR: [
            { currency: { equals: "USDC", mode: "insensitive" } },
            { currency: { equals: "SOL", mode: "insensitive" } },
            { network: { equals: "SOL", mode: "insensitive" } },
            { network: { equals: "SOLANA", mode: "insensitive" } },
          ],
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      })
    : null;

  const configuredWallet =
    payoutMethod?.walletAddress ||
    process.env.SOLANA_TREASURY_WALLET ||
    process.env.NEXT_PUBLIC_SOLANA_TREASURY_WALLET ||
    "";

  if (!configuredWallet) {
    throw new Error(
      "This campaign needs a Solana payout wallet before Jupiter donations can be accepted.",
    );
  }

  let owner: PublicKey;
  try {
    owner = new PublicKey(configuredWallet);
  } catch {
    throw new Error("The configured Solana payout wallet is not a valid public key.");
  }

  return {
    owner,
    usdcTokenAccount: getUsdcAta(owner),
    source: payoutMethod ? "campaign_payout_method" : "environment",
  };
}

export function createTreasuryUsdcAtaInstruction(args: {
  payer: PublicKey;
  treasuryOwner: PublicKey;
  treasuryUsdcTokenAccount: PublicKey;
}) {
  return createAssociatedTokenAccountIdempotentInstruction(
    args.payer,
    args.treasuryUsdcTokenAccount,
    args.treasuryOwner,
    getUsdcMintPublicKey(),
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function getTokenAccountDelta(args: {
  transaction: NonNullable<Awaited<ReturnType<Connection["getParsedTransaction"]>>>;
  tokenAccount: string;
  mint: string;
}) {
  const accountKeys = args.transaction.transaction.message.accountKeys.map((account) =>
    account.pubkey.toString(),
  );
  const pre = args.transaction.meta?.preTokenBalances || [];
  const post = args.transaction.meta?.postTokenBalances || [];

  const preAmount = pre.reduce((sum, balance) => {
    if (balance.mint !== args.mint) return sum;
    const accountKey = accountKeys[balance.accountIndex];
    if (accountKey !== args.tokenAccount) return sum;
    return sum + BigInt(balance.uiTokenAmount.amount || "0");
  }, BigInt(0));

  const postAmount = post.reduce((sum, balance) => {
    if (balance.mint !== args.mint) return sum;
    const accountKey = accountKeys[balance.accountIndex];
    if (accountKey !== args.tokenAccount) return sum;
    return sum + BigInt(balance.uiTokenAmount.amount || "0");
  }, BigInt(0));

  return postAmount - preAmount;
}
