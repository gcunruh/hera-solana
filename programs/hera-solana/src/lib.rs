use anchor_lang::prelude::*;
use anchor_lang::prelude::Pubkey;
use anchor_spl::token::{self};
use anchor_spl::{token::{Token, Mint, TokenAccount}};

declare_id!("EhVhhvQEhyRELEKSsivfSo1YFxKa4btgspR9WGjcP6Ei");

#[program]
pub mod hera_solana {
    use super::*;

    pub fn initialize_fund(ctx: Context<InitializeFund>, idx: u64, fy_premium: f32, fy_allowable: f32, year: u16) -> Result<()> {
        let fund_data = &mut ctx.accounts.fund_data;
        fund_data.fy_premium = fy_premium;
        fund_data.fy_allowable = fy_allowable;
        fund_data.year = year;
        
        Ok(())
    }

    pub fn seed_fund(ctx: Context<SeedFund>, amount: u16) -> Result<()> {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from_account.to_account_info(),
                    to: ctx.accounts.fund.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            ),
            amount.into()
        )?;

        Ok(())
    }

    pub fn enroll(ctx: Context<Enroll>, paid_in: u16) -> Result<()> {
        // init enrollment information
        let fund_data = &ctx.accounts.fund_data;
        let enrollment = &mut ctx.accounts.enrollment;
        enrollment.paid_in = paid_in.into();
        enrollment.fund =  fund_data.key();
        enrollment.subscriber = ctx.accounts.subscriber.key();
        enrollment.bump = *ctx.bumps.get("enrollment").unwrap();

        // transfer paid_in
            token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from_account.to_account_info(),
                    to: ctx.accounts.fund.to_account_info(),
                    authority: ctx.accounts.subscriber.to_account_info(),
                },
            ),
            paid_in.into()
        )?;

        Ok(())
    }

    pub fn make_claim(ctx: Context<MakeClaim>, idx: u64, claim_amount: u16) -> Result<()> {
        let enrollment = &ctx.accounts.enrollment;
        assert_eq!(
            enrollment.subscriber.key(),
            ctx.accounts.subscriber.key()
        );
        if enrollment.paid_in < 1 {
            return Err(error!(HeraError::NotEligible));
        }
        let claim = &mut ctx.accounts.claim;
        claim.status = "PENDING".to_owned();
        claim.claim_amount = claim_amount.into();
        claim.bump =  *ctx.bumps.get("claim").unwrap();
        Ok(())
    }
}

#[account]
pub struct FundData {
    creator: Pubkey,
    fy_premium: f32,
    fy_allowable: f32,
    year: u16
}

#[account]
pub struct Enrollment {
    fund: Pubkey,
    subscriber: Pubkey,
    paid_in: u64,
    bump: u8
}

#[account]
pub struct Claim {
    status: String,
    claim_amount: u64,
    bump: u8
}

#[derive(Accounts)]
#[instruction(idx: u64)]
pub struct InitializeFund<'info> {
    #[account(
        init,
        seeds=[b"fund_data".as_ref(), idx.to_le_bytes().as_ref()],
        bump,
        payer = creator, 
        space = 8 + 32 + 32 + 32 + 64
    )]
    fund_data: Account<'info, FundData>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        seeds=[b"fund".as_ref(), idx.to_le_bytes().as_ref()],
        bump,
        payer = creator,
        token::mint = mint,
        token::authority = fund_data,
    )]
    pub fund: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SeedFund<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub fund: Account<'info, TokenAccount>,
    #[account(mut, constraint = from_account.owner == sender.key())]
    pub from_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Enroll<'info> {
    #[account(mut)]
    pub subscriber:  Signer<'info>,
    /// CHECK: Only using it to reference the enrollment
    pub fund_data: AccountInfo<'info>,
    #[account(
        init,
        payer = subscriber,
        space = 8 + 32 + 32 + 64 + 1, 
        seeds = [b"enrollment", subscriber.key().as_ref()], bump
    )]
    pub enrollment: Account<'info, Enrollment>,
    #[account(mut)]
    pub fund: Account<'info, TokenAccount>,
    #[account(mut, constraint = from_account.owner == subscriber.key())]
    pub from_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

}

#[derive(Accounts)]
#[instruction(idx: u64)]
pub struct MakeClaim<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,
    #[account(mut, seeds = [b"enrollment", subscriber.key().as_ref()], bump = enrollment.bump)]
    pub enrollment: Account<'info, Enrollment>,
    #[account(
        init,
        payer = subscriber,
        space = 8 + 32 + 64 + 100 + 1, 
        seeds = [b"claim", subscriber.key().as_ref(), enrollment.key().as_ref(), idx.to_le_bytes().as_ref()], 
        bump
    )]
    pub claim: Account<'info, Claim>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum HeraError {
    #[msg("Ineligible!")]
    NotEligible,
}