import * as anchor from "@project-serum/anchor";
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
import uuidBuffer from "uuid-buffer";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
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

});
