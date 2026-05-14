use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("2hjqQzTXa5HGqS4zwe8Q89NXkdTrfdPVhmAkVmNHBCTb");

const MAX_MILESTONES: usize = 10;
const STATUS_ACTIVE: u8 = 0;
const STATUS_SUCCESSFUL: u8 = 1;
const STATUS_FAILED: u8 = 2;

#[program]
pub mod oneraise_escrow {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        goal_amount: u64,
        deadline: i64,
        milestone_amounts: Vec<u64>,
        verifier: Pubkey,
        beneficiary: Pubkey,
    ) -> Result<()> {
        require!(goal_amount > 0, EscrowError::InvalidGoal);
        require!(
            !milestone_amounts.is_empty() && milestone_amounts.len() <= MAX_MILESTONES,
            EscrowError::InvalidMilestones
        );
        require!(verifier != Pubkey::default(), EscrowError::InvalidAuthority);
        require!(
            beneficiary != Pubkey::default(),
            EscrowError::InvalidAuthority
        );

        let clock = Clock::get()?;
        require!(
            deadline > clock.unix_timestamp,
            EscrowError::InvalidDeadline
        );

        let mut milestone_total = 0_u64;
        let mut milestones = [Milestone::default(); MAX_MILESTONES];

        for (index, amount) in milestone_amounts.iter().enumerate() {
            require!(*amount > 0, EscrowError::InvalidMilestones);
            milestone_total = milestone_total
                .checked_add(*amount)
                .ok_or(EscrowError::MathOverflow)?;
            milestones[index] = Milestone {
                amount: *amount,
                approved: false,
                released: false,
            };
        }

        require!(
            milestone_total == goal_amount,
            EscrowError::MilestoneTotalMismatch
        );

        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.beneficiary = beneficiary;
        campaign.verifier = verifier;
        campaign.mint = ctx.accounts.mint.key();
        campaign.vault = ctx.accounts.vault.key();
        campaign.campaign_id = campaign_id;
        campaign.goal_amount = goal_amount;
        campaign.total_raised = 0;
        campaign.total_released = 0;
        campaign.total_refunded = 0;
        campaign.deadline = deadline;
        campaign.milestone_count = milestone_amounts.len() as u8;
        campaign.status = STATUS_ACTIVE;
        campaign.bump = ctx.bumps.campaign;
        campaign.vault_bump = ctx.bumps.vault;
        campaign.milestones = milestones;

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);

        let clock = Clock::get()?;
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == STATUS_ACTIVE,
            EscrowError::CampaignNotActive
        );
        require!(
            clock.unix_timestamp < campaign.deadline,
            EscrowError::CampaignExpired
        );

        campaign.total_raised = campaign
            .total_raised
            .checked_add(amount)
            .ok_or(EscrowError::MathOverflow)?;

        let donation = &mut ctx.accounts.donation;
        donation.donor = ctx.accounts.donor.key();
        donation.campaign = campaign.key();
        donation.amount = donation
            .amount
            .checked_add(amount)
            .ok_or(EscrowError::MathOverflow)?;
        donation.refunded = false;
        donation.bump = ctx.bumps.donation;

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.donor_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.donor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        Ok(())
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>, milestone_index: u8) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == STATUS_ACTIVE,
            EscrowError::CampaignNotActive
        );

        let index = milestone_index as usize;
        require!(
            index < campaign.milestone_count as usize,
            EscrowError::InvalidMilestoneIndex
        );

        let milestone = &mut campaign.milestones[index];
        require!(!milestone.approved, EscrowError::MilestoneAlreadyApproved);
        require!(!milestone.released, EscrowError::MilestoneAlreadyReleased);
        milestone.approved = true;

        Ok(())
    }

    pub fn release_milestone(ctx: Context<ReleaseMilestone>, milestone_index: u8) -> Result<()> {
        let (campaign_key, creator, campaign_id, bump, amount) = {
            let campaign = &mut ctx.accounts.campaign;
            require!(
                campaign.status == STATUS_ACTIVE,
                EscrowError::CampaignNotActive
            );
            require!(
                campaign.total_raised >= campaign.goal_amount,
                EscrowError::GoalNotReached
            );

            let index = milestone_index as usize;
            require!(
                index < campaign.milestone_count as usize,
                EscrowError::InvalidMilestoneIndex
            );

            let amount = {
                let milestone = &mut campaign.milestones[index];
                require!(milestone.approved, EscrowError::MilestoneNotApproved);
                require!(!milestone.released, EscrowError::MilestoneAlreadyReleased);
                milestone.released = true;
                milestone.amount
            };

            campaign.total_released = campaign
                .total_released
                .checked_add(amount)
                .ok_or(EscrowError::MathOverflow)?;

            let all_released = campaign.milestones[..campaign.milestone_count as usize]
                .iter()
                .all(|milestone| milestone.released);
            if all_released {
                campaign.status = STATUS_SUCCESSFUL;
            }

            (
                campaign.key(),
                campaign.creator,
                campaign.campaign_id.to_le_bytes(),
                campaign.bump,
                amount,
            )
        };
        let signer_seeds: &[&[u8]] =
            &[b"campaign", creator.as_ref(), campaign_id.as_ref(), &[bump]];
        let signer = &[signer_seeds];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        emit!(MilestoneReleased {
            campaign: campaign_key,
            milestone_index,
            amount,
        });

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let clock = Clock::get()?;
        let (creator, campaign_id, bump, refund_amount) = {
            let campaign = &mut ctx.accounts.campaign;
            require!(
                campaign.status == STATUS_ACTIVE,
                EscrowError::CampaignNotActive
            );
            require!(
                clock.unix_timestamp >= campaign.deadline,
                EscrowError::RefundNotAvailable
            );
            require!(
                campaign.total_raised < campaign.goal_amount,
                EscrowError::GoalAlreadyReached
            );
            require!(
                campaign.total_released == 0,
                EscrowError::FundsAlreadyReleased
            );

            let donation = &mut ctx.accounts.donation;
            require!(!donation.refunded, EscrowError::DonationAlreadyRefunded);
            require!(donation.amount > 0, EscrowError::NothingToRefund);

            let refund_amount = donation.amount;
            donation.refunded = true;
            campaign.total_refunded = campaign
                .total_refunded
                .checked_add(refund_amount)
                .ok_or(EscrowError::MathOverflow)?;

            if campaign.total_refunded >= campaign.total_raised {
                campaign.status = STATUS_FAILED;
            }

            (
                campaign.creator,
                campaign.campaign_id.to_le_bytes(),
                campaign.bump,
                refund_amount,
            )
        };
        let signer_seeds: &[&[u8]] =
            &[b"campaign", creator.as_ref(), campaign_id.as_ref(), &[bump]];
        let signer = &[signer_seeds];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.donor_token_account.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer_checked(cpi_ctx, refund_amount, ctx.accounts.mint.decimals)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = Campaign::LEN,
        seeds = [b"campaign", creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump
    )]
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = campaign,
        seeds = [b"vault", campaign.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(
        mut,
        has_one = mint @ EscrowError::WrongMint,
        constraint = campaign.vault == vault.key() @ EscrowError::WrongVault,
    )]
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(
        mut,
        constraint = vault.key() == campaign.vault @ EscrowError::WrongVault,
        constraint = vault.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = vault.owner == campaign.key() @ EscrowError::WrongVaultAuthority,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = donor,
        space = Donation::LEN,
        seeds = [b"donation", campaign.key().as_ref(), donor.key().as_ref()],
        bump
    )]
    pub donation: Box<Account<'info, Donation>>,
    #[account(
        mut,
        constraint = donor_token_account.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = donor_token_account.owner == donor.key() @ EscrowError::Unauthorized,
    )]
    pub donor_token_account: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    pub verifier: Signer<'info>,
    #[account(
        mut,
        constraint = campaign.verifier == verifier.key() @ EscrowError::Unauthorized,
    )]
    pub campaign: Box<Account<'info, Campaign>>,
}

#[derive(Accounts)]
pub struct ReleaseMilestone<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        has_one = mint @ EscrowError::WrongMint,
        constraint = campaign.beneficiary == beneficiary.key() @ EscrowError::Unauthorized,
        constraint = campaign.vault == vault.key() @ EscrowError::WrongVault,
    )]
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(
        mut,
        constraint = vault.key() == campaign.vault @ EscrowError::WrongVault,
        constraint = vault.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = vault.owner == campaign.key() @ EscrowError::WrongVaultAuthority,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = beneficiary_token_account.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = beneficiary_token_account.owner == beneficiary.key() @ EscrowError::Unauthorized,
    )]
    pub beneficiary_token_account: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(
        mut,
        has_one = mint @ EscrowError::WrongMint,
        constraint = campaign.vault == vault.key() @ EscrowError::WrongVault,
    )]
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(
        mut,
        constraint = vault.key() == campaign.vault @ EscrowError::WrongVault,
        constraint = vault.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = vault.owner == campaign.key() @ EscrowError::WrongVaultAuthority,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"donation", campaign.key().as_ref(), donor.key().as_ref()],
        bump = donation.bump,
        constraint = donation.donor == donor.key() @ EscrowError::Unauthorized,
        constraint = donation.campaign == campaign.key() @ EscrowError::WrongDonation,
    )]
    pub donation: Box<Account<'info, Donation>>,
    #[account(
        mut,
        constraint = donor_token_account.mint == campaign.mint @ EscrowError::WrongMint,
        constraint = donor_token_account.owner == donor.key() @ EscrowError::Unauthorized,
    )]
    pub donor_token_account: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub beneficiary: Pubkey,
    pub verifier: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub campaign_id: u64,
    pub goal_amount: u64,
    pub total_raised: u64,
    pub total_released: u64,
    pub total_refunded: u64,
    pub deadline: i64,
    pub milestone_count: u8,
    pub status: u8,
    pub bump: u8,
    pub vault_bump: u8,
    pub milestones: [Milestone; MAX_MILESTONES],
}

impl Campaign {
    pub const LEN: usize = 8 + (32 * 5) + (8 * 6) + 4 + (Milestone::LEN * MAX_MILESTONES);
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Milestone {
    pub amount: u64,
    pub approved: bool,
    pub released: bool,
}

impl Milestone {
    pub const LEN: usize = 8 + 1 + 1;
}

#[account]
pub struct Donation {
    pub donor: Pubkey,
    pub campaign: Pubkey,
    pub amount: u64,
    pub refunded: bool,
    pub bump: u8,
}

impl Donation {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

#[event]
pub struct MilestoneReleased {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
}

#[error_code]
pub enum EscrowError {
    #[msg("The campaign goal must be greater than zero.")]
    InvalidGoal,
    #[msg("Milestones must contain between one and ten positive amounts.")]
    InvalidMilestones,
    #[msg("Milestone amounts must add up to the campaign goal.")]
    MilestoneTotalMismatch,
    #[msg("The campaign deadline must be in the future.")]
    InvalidDeadline,
    #[msg("The verifier and beneficiary must be valid public keys.")]
    InvalidAuthority,
    #[msg("The amount must be greater than zero.")]
    InvalidAmount,
    #[msg("The campaign is not active.")]
    CampaignNotActive,
    #[msg("The campaign donation deadline has passed.")]
    CampaignExpired,
    #[msg("The campaign goal has not been reached.")]
    GoalNotReached,
    #[msg("The campaign goal was already reached.")]
    GoalAlreadyReached,
    #[msg("Refunds are not available for this campaign yet.")]
    RefundNotAvailable,
    #[msg("Funds were already released from this campaign.")]
    FundsAlreadyReleased,
    #[msg("The milestone index is invalid.")]
    InvalidMilestoneIndex,
    #[msg("The milestone has not been approved.")]
    MilestoneNotApproved,
    #[msg("The milestone has already been approved.")]
    MilestoneAlreadyApproved,
    #[msg("The milestone has already been released.")]
    MilestoneAlreadyReleased,
    #[msg("The donation has already been refunded.")]
    DonationAlreadyRefunded,
    #[msg("There is nothing to refund.")]
    NothingToRefund,
    #[msg("The signer is not authorized for this action.")]
    Unauthorized,
    #[msg("The token mint does not match the campaign mint.")]
    WrongMint,
    #[msg("The vault does not match the campaign vault.")]
    WrongVault,
    #[msg("The vault authority does not match the campaign PDA.")]
    WrongVaultAuthority,
    #[msg("The donation account does not belong to this campaign.")]
    WrongDonation,
    #[msg("A checked arithmetic operation overflowed.")]
    MathOverflow,
}
