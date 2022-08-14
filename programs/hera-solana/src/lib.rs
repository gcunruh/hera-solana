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
}

#[account]
pub struct FundData {
    creator: Pubkey,
    fy_premium: f32,
    fy_allowable: f32,
    year: u16
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