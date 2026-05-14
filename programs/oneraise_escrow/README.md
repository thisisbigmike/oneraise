# OneRaise Escrow

`oneraise_escrow` is the first on-chain implementation of OneRaise Protect. It holds SPL token donations in a PDA-owned vault, lets a campaign-selected verifier approve milestones, releases approved tranches to the beneficiary, and allows donor refunds when a campaign misses its goal before the deadline.

## Instructions

- `create_campaign(campaign_id, goal_amount, deadline, milestone_amounts, verifier, beneficiary)`
- `donate(amount)`
- `approve_milestone(milestone_index)`
- `release_milestone(milestone_index)`
- `refund()`

## Security Shape

- All custody uses PDA-controlled SPL token vaults.
- All token-moving arithmetic uses checked `u64` operations.
- The verifier must match `campaign.verifier` before approving milestones.
- The beneficiary must match `campaign.beneficiary` before claiming milestone funds.
- Donor, vault, and beneficiary token accounts must match the campaign mint.
- Refunds are available only after the campaign deadline when the goal was not reached.

## Local Build

Anchor 0.30.1 currently has an IDL generation incompatibility with the newest Rust/proc-macro toolchain in this environment. The scannable SBF program builds with:

```bash
npm run anchor:build
```

The TypeScript integration tests are in `tests/oneraise_escrow.ts`. They are intended to run with:

```bash
anchor test --skip-build
```

In this workspace, `solana-test-validator` exits before writing logs, so local integration execution is blocked by validator startup rather than by program compilation.
