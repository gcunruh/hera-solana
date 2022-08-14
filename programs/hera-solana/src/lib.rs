use anchor_lang::prelude::*;
use anchor_lang::prelude::Pubkey;
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
