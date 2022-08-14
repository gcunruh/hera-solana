import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { HeraSolana } from "../target/types/hera_solana";

describe("hera-solana", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HeraSolana as Program<HeraSolana>;
  const programId = program.programId;
  const HERA_USDC_MINT = new PublicKey("5kU3fkzBcmpirSbjDY99QqQ3Zq8ABks1JMzZxAVx16Da");

  const idx = new anchor.BN(parseInt((Date.now() / 1000).toString()));
  const idxBuffer = idx.toBuffer('le', 8);

  const fundDataSeeds = [
    Buffer.from("fund_data"),
    idxBuffer
  ]

  const fundSeeds = [
    Buffer.from("fund"),
    idxBuffer
  ]

  const [fundDataPda, fundDataBump] = await anchor.web3.PublicKey
      .findProgramAddress(
          fundDataSeeds,
          programId,
      );

  const [fundPda, fundBump] = await anchor.web3.PublicKey
      .findProgramAddress(
          fundSeeds,
          programId,
      );

  const tokenAta = await getAssociatedTokenAddress(
    HERA_USDC_MINT,
    provider.wallet.publicKey,
    true,
    spl.TOKEN_PROGRAM_ID,
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  )

  it("Initialize Fund", async () => {
    console.log("Init-ing new fund");
    let tx = new anchor.web3.Transaction();

    const args = {
      idx: idx,
      fyPremium: 200.00,
      fyAllowable: 600.00,
      year: 2022
    }

    tx.add(
      await program.methods
        .initializeFund(args.idx, args.fyPremium, args.fyAllowable, args.year)
        .accounts({
          fundData: fundDataPda,
          creator: provider.wallet.publicKey,
          fund: fundPda,
          mint: HERA_USDC_MINT
        })
        .instruction()
    );

    await provider.sendAndConfirm(tx);
    console.log("Success!", tx);
  });

  it("Seed Fund", async () => {
    console.log("Seeding fund");
    let tx2 = new anchor.web3.Transaction();

    const args = {
      amount: 1
    }

    tx2.add(
      await program.methods
        .seedFund(args.amount)
        .accounts({
          sender: provider.wallet.publicKey,
          fund: fundPda,
          fromAccount: tokenAta
        }).instruction()
    )

    await provider.sendAndConfirm(tx2);
    console.log("Success!", tx2);
  });

});
