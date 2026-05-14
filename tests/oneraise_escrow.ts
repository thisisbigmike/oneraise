import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

const PROGRAM_ID = new PublicKey("2hjqQzTXa5HGqS4zwe8Q89NXkdTrfdPVhmAkVmNHBCTb");

const IDL = {
  address: PROGRAM_ID.toString(),
  metadata: {
    name: "oneraise_escrow",
    version: "0.1.0",
    spec: "0.1.0",
  },
  version: "0.1.0",
  name: "oneraise_escrow",
  instructions: [
    {
      name: "createCampaign",
      accounts: [
        { name: "creator", isMut: true, isSigner: true },
        { name: "campaign", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "mint", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [
        { name: "campaignId", type: "u64" },
        { name: "goalAmount", type: "u64" },
        { name: "deadline", type: "i64" },
        { name: "milestoneAmounts", type: { vec: "u64" } },
        { name: "verifier", type: "publicKey" },
        { name: "beneficiary", type: "publicKey" },
      ],
    },
    {
      name: "donate",
      accounts: [
        { name: "donor", isMut: true, isSigner: true },
        { name: "campaign", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "donation", isMut: true, isSigner: false },
        { name: "donorTokenAccount", isMut: true, isSigner: false },
        { name: "mint", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "approveMilestone",
      accounts: [
        { name: "verifier", isMut: false, isSigner: true },
        { name: "campaign", isMut: true, isSigner: false },
      ],
      args: [{ name: "milestoneIndex", type: "u8" }],
    },
    {
      name: "releaseMilestone",
      accounts: [
        { name: "beneficiary", isMut: true, isSigner: true },
        { name: "campaign", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "beneficiaryTokenAccount", isMut: true, isSigner: false },
        { name: "mint", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "milestoneIndex", type: "u8" }],
    },
    {
      name: "refund",
      accounts: [
        { name: "donor", isMut: true, isSigner: true },
        { name: "campaign", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "donation", isMut: true, isSigner: false },
        { name: "donorTokenAccount", isMut: true, isSigner: false },
        { name: "mint", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Campaign",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "beneficiary", type: "publicKey" },
          { name: "verifier", type: "publicKey" },
          { name: "mint", type: "publicKey" },
          { name: "vault", type: "publicKey" },
          { name: "campaignId", type: "u64" },
          { name: "goalAmount", type: "u64" },
          { name: "totalRaised", type: "u64" },
          { name: "totalReleased", type: "u64" },
          { name: "totalRefunded", type: "u64" },
          { name: "deadline", type: "i64" },
          { name: "milestoneCount", type: "u8" },
          { name: "status", type: "u8" },
          { name: "bump", type: "u8" },
          { name: "vaultBump", type: "u8" },
          { name: "milestones", type: { array: [{ defined: "Milestone" }, 10] } },
        ],
      },
    },
    {
      name: "Donation",
      type: {
        kind: "struct",
        fields: [
          { name: "donor", type: "publicKey" },
          { name: "campaign", type: "publicKey" },
          { name: "amount", type: "u64" },
          { name: "refunded", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "Milestone",
      type: {
        kind: "struct",
        fields: [
          { name: "amount", type: "u64" },
          { name: "approved", type: "bool" },
          { name: "released", type: "bool" },
        ],
      },
    },
  ],
  events: [
    {
      name: "MilestoneReleased",
      fields: [
        { name: "campaign", type: "publicKey", index: false },
        { name: "milestoneIndex", type: "u8", index: false },
        { name: "amount", type: "u64", index: false },
      ],
    },
  ],
  errors: [
    { code: 6000, name: "InvalidGoal", msg: "The campaign goal must be greater than zero." },
    { code: 6001, name: "InvalidMilestones", msg: "Milestones must contain between one and ten positive amounts." },
    { code: 6002, name: "MilestoneTotalMismatch", msg: "Milestone amounts must add up to the campaign goal." },
    { code: 6003, name: "InvalidDeadline", msg: "The campaign deadline must be in the future." },
    { code: 6004, name: "InvalidAuthority", msg: "The verifier and beneficiary must be valid public keys." },
    { code: 6005, name: "InvalidAmount", msg: "The amount must be greater than zero." },
    { code: 6006, name: "CampaignNotActive", msg: "The campaign is not active." },
    { code: 6007, name: "CampaignExpired", msg: "The campaign donation deadline has passed." },
    { code: 6008, name: "GoalNotReached", msg: "The campaign goal has not been reached." },
    { code: 6009, name: "GoalAlreadyReached", msg: "The campaign goal was already reached." },
    { code: 6010, name: "RefundNotAvailable", msg: "Refunds are not available for this campaign yet." },
    { code: 6011, name: "FundsAlreadyReleased", msg: "Funds were already released from this campaign." },
    { code: 6012, name: "InvalidMilestoneIndex", msg: "The milestone index is invalid." },
    { code: 6013, name: "MilestoneNotApproved", msg: "The milestone has not been approved." },
    { code: 6014, name: "MilestoneAlreadyApproved", msg: "The milestone has already been approved." },
    { code: 6015, name: "MilestoneAlreadyReleased", msg: "The milestone has already been released." },
    { code: 6016, name: "DonationAlreadyRefunded", msg: "The donation has already been refunded." },
    { code: 6017, name: "NothingToRefund", msg: "There is nothing to refund." },
    { code: 6018, name: "Unauthorized", msg: "The signer is not authorized for this action." },
    { code: 6019, name: "WrongMint", msg: "The token mint does not match the campaign mint." },
    { code: 6020, name: "WrongVault", msg: "The vault does not match the campaign vault." },
    { code: 6021, name: "WrongVaultAuthority", msg: "The vault authority does not match the campaign PDA." },
    { code: 6022, name: "WrongDonation", msg: "The donation account does not belong to this campaign." },
    { code: 6023, name: "MathOverflow", msg: "A checked arithmetic operation overflowed." },
  ],
};

describe("oneraise_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL as unknown as anchor.Idl, provider);

  const decimals = 6;
  const goalAmount = new anchor.BN(1_000_000_000);
  const milestoneAmounts = [
    new anchor.BN(400_000_000),
    new anchor.BN(600_000_000),
  ];

  async function fund(keypair: Keypair) {
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      5 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(signature, "confirmed");
  }

  function campaignId() {
    return new anchor.BN(Date.now() + Math.floor(Math.random() * 100_000));
  }

  function campaignSeeds(creator: PublicKey, id: anchor.BN) {
    return [
      Buffer.from("campaign"),
      creator.toBuffer(),
      id.toArrayLike(Buffer, "le", 8),
    ];
  }

  async function setupCampaign(args: {
    goal?: anchor.BN;
    milestones?: anchor.BN[];
    deadlineOffsetSeconds?: number;
  } = {}) {
    const creator = Keypair.generate();
    const donor = Keypair.generate();
    const beneficiary = Keypair.generate();
    const verifier = Keypair.generate();

    await Promise.all([fund(creator), fund(donor), fund(beneficiary), fund(verifier)]);

    const mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      decimals,
    );
    const donorTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      donor,
      mint,
      donor.publicKey,
    );
    const beneficiaryTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      beneficiary,
      mint,
      beneficiary.publicKey,
    );

    await mintTo(
      provider.connection,
      creator,
      mint,
      donorTokenAccount,
      creator.publicKey,
      Number(goalAmount.toString()) * 2,
    );

    const id = campaignId();
    const [campaign] = PublicKey.findProgramAddressSync(
      campaignSeeds(creator.publicKey, id),
      program.programId,
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), campaign.toBuffer()],
      program.programId,
    );
    const [donation] = PublicKey.findProgramAddressSync(
      [Buffer.from("donation"), campaign.toBuffer(), donor.publicKey.toBuffer()],
      program.programId,
    );

    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + (args.deadlineOffsetSeconds ?? 60));

    await program.methods
      .createCampaign(
        id,
        args.goal ?? goalAmount,
        deadline,
        args.milestones ?? milestoneAmounts,
        verifier.publicKey,
        beneficiary.publicKey,
      )
      .accounts({
        creator: creator.publicKey,
        campaign,
        vault,
        mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    return {
      creator,
      donor,
      beneficiary,
      verifier,
      mint,
      donorTokenAccount,
      beneficiaryTokenAccount,
      campaign,
      vault,
      donation,
    };
  }

  it("creates a campaign, accepts donation, and releases approved milestone funds", async () => {
    const fixture = await setupCampaign();

    await program.methods
      .donate(goalAmount)
      .accounts({
        donor: fixture.donor.publicKey,
        campaign: fixture.campaign,
        vault: fixture.vault,
        donation: fixture.donation,
        donorTokenAccount: fixture.donorTokenAccount,
        mint: fixture.mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.donor])
      .rpc();

    await program.methods
      .approveMilestone(0)
      .accounts({
        verifier: fixture.verifier.publicKey,
        campaign: fixture.campaign,
      })
      .signers([fixture.verifier])
      .rpc();

    await program.methods
      .releaseMilestone(0)
      .accounts({
        beneficiary: fixture.beneficiary.publicKey,
        campaign: fixture.campaign,
        vault: fixture.vault,
        beneficiaryTokenAccount: fixture.beneficiaryTokenAccount,
        mint: fixture.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.beneficiary])
      .rpc();

    const beneficiaryAccount = await getAccount(
      provider.connection,
      fixture.beneficiaryTokenAccount,
    );
    assert.equal(beneficiaryAccount.amount.toString(), milestoneAmounts[0].toString());
  });

  it("rejects invalid milestone totals", async () => {
    const creator = Keypair.generate();
    await fund(creator);

    const mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      decimals,
    );
    const id = campaignId();
    const [campaign] = PublicKey.findProgramAddressSync(
      campaignSeeds(creator.publicKey, id),
      program.programId,
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), campaign.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .createCampaign(
          id,
          goalAmount,
          new anchor.BN(Math.floor(Date.now() / 1000) + 60),
          [new anchor.BN(1)],
          Keypair.generate().publicKey,
          Keypair.generate().publicKey,
        )
        .accounts({
          creator: creator.publicKey,
          campaign,
          vault,
          mint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([creator])
        .rpc();
      assert.fail("expected invalid milestone totals to fail");
    } catch (error) {
      assert.include(String(error), "MilestoneTotalMismatch");
    }
  });

  it("rejects milestone approval by a non-verifier", async () => {
    const fixture = await setupCampaign();
    const attacker = Keypair.generate();
    await fund(attacker);

    try {
      await program.methods
        .approveMilestone(0)
        .accounts({
          verifier: attacker.publicKey,
          campaign: fixture.campaign,
        })
        .signers([attacker])
        .rpc();
      assert.fail("expected non-verifier approval to fail");
    } catch (error) {
      assert.include(String(error), "Unauthorized");
    }
  });

  it("prevents double release", async () => {
    const fixture = await setupCampaign();

    await program.methods
      .donate(goalAmount)
      .accounts({
        donor: fixture.donor.publicKey,
        campaign: fixture.campaign,
        vault: fixture.vault,
        donation: fixture.donation,
        donorTokenAccount: fixture.donorTokenAccount,
        mint: fixture.mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.donor])
      .rpc();

    await program.methods
      .approveMilestone(0)
      .accounts({
        verifier: fixture.verifier.publicKey,
        campaign: fixture.campaign,
      })
      .signers([fixture.verifier])
      .rpc();

    const release = () =>
      program.methods
        .releaseMilestone(0)
        .accounts({
          beneficiary: fixture.beneficiary.publicKey,
          campaign: fixture.campaign,
          vault: fixture.vault,
          beneficiaryTokenAccount: fixture.beneficiaryTokenAccount,
          mint: fixture.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fixture.beneficiary])
        .rpc();

    await release();

    try {
      await release();
      assert.fail("expected second release to fail");
    } catch (error) {
      assert.include(String(error), "MilestoneAlreadyReleased");
    }
  });

  it("allows refunds after a failed campaign deadline", async () => {
    const fixture = await setupCampaign({ deadlineOffsetSeconds: 2 });
    const partialDonation = new anchor.BN(250_000_000);

    await program.methods
      .donate(partialDonation)
      .accounts({
        donor: fixture.donor.publicKey,
        campaign: fixture.campaign,
        vault: fixture.vault,
        donation: fixture.donation,
        donorTokenAccount: fixture.donorTokenAccount,
        mint: fixture.mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.donor])
      .rpc();

    try {
      await program.methods
        .refund()
        .accounts({
          donor: fixture.donor.publicKey,
          campaign: fixture.campaign,
          vault: fixture.vault,
          donation: fixture.donation,
          donorTokenAccount: fixture.donorTokenAccount,
          mint: fixture.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fixture.donor])
        .rpc();
      assert.fail("expected refund before deadline to fail");
    } catch (error) {
      assert.include(String(error), "RefundNotAvailable");
    }

    await new Promise((resolve) => setTimeout(resolve, 2_500));

    const before = await getAccount(provider.connection, fixture.donorTokenAccount);

    await program.methods
      .refund()
      .accounts({
        donor: fixture.donor.publicKey,
        campaign: fixture.campaign,
        vault: fixture.vault,
        donation: fixture.donation,
        donorTokenAccount: fixture.donorTokenAccount,
        mint: fixture.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.donor])
      .rpc();

    const after = await getAccount(provider.connection, fixture.donorTokenAccount);
    assert.equal(
      (after.amount - before.amount).toString(),
      partialDonation.toString(),
    );
  });
});
