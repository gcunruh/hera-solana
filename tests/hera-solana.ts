import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import { Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { createAssociatedTokenAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { HeraSolana } from "../target/types/hera_solana";

describe("hera-solana", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HeraSolana as Program<HeraSolana>;
  const programId = program.programId;
  const HERA_USDC_MINT = new PublicKey("5kU3fkzBcmpirSbjDY99QqQ3Zq8ABks1JMzZxAVx16Da");
  let subscriberTokenAccount: anchor.web3.PublicKey;

  const idx = new anchor.BN(parseInt((Date.now() / 1000).toString()));
  const idxBuffer = idx.toBuffer('le', 8);

  const claimIdx = new anchor.BN(parseInt((Date.now() / 1000).toString()));
  const claimIdxBuffer = idx.toBuffer('le', 8);

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

  const subscriber = new anchor.web3.Keypair();

  before('prep accounts', async () => {
    subscriberTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as NodeWallet).payer,
      HERA_USDC_MINT,
      subscriber.publicKey
    );

    const fundSubscriber = new anchor.web3.Transaction();
    fundSubscriber.add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: subscriber.publicKey,
        lamports: 0.5 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );

    const txFundTokenAccount = new anchor.web3.Transaction();
    txFundTokenAccount.add(spl.createTransferInstruction(
      tokenAta,
      subscriberTokenAccount,
      provider.wallet.publicKey,
      11
    ));

    const fundSubscriberSig = await provider.sendAndConfirm(fundSubscriber, []);
    const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount, []);
  })

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
      amount: 10
    }

    tx2.add(
      await program.methods
        .seedFund(new anchor.BN(args.amount))
        .accounts({
          sender: provider.wallet.publicKey,
          fund: fundPda,
          fromAccount: tokenAta
        }).instruction()
    )

    await provider.sendAndConfirm(tx2);
    console.log("Success!", tx2);
  });

  it("Enroll", async () => {
    console.log("Enrolling user in fund");

    const enrollmentSeeds = [
      Buffer.from("enrollment"),
      subscriber.publicKey.toBuffer()
    ]

    const [enrollmentPda, enrollmentBump] = await anchor.web3.PublicKey
        .findProgramAddress(
            enrollmentSeeds,
            programId,
    );

    let tx3 = new anchor.web3.Transaction();

    const args = {
      paid_in: 1
    }

    tx3.add(
      await program.methods.enroll(new anchor.BN(args.paid_in)).accounts({
        subscriber: subscriber.publicKey,
        fundData: fundDataPda,
        enrollment: enrollmentPda,
        fund: fundPda,
        fromAccount: subscriberTokenAccount
      }).instruction()
    )

    await provider.sendAndConfirm(tx3, [subscriber])
    console.log("Success!", tx3);
  })

  it("Make Claim", async() => {
    const enrollmentSeeds = [
      Buffer.from("enrollment"),
      subscriber.publicKey.toBuffer()
    ]

    const [enrollmentPda, enrollmentBump] = await anchor.web3.PublicKey
        .findProgramAddress(
            enrollmentSeeds,
            programId,
    );

    const claimSeeds = [
      Buffer.from("claim"),
      subscriber.publicKey.toBuffer(),
      enrollmentPda.toBuffer(),
      claimIdxBuffer
    ]

    const [claimPda, claimBump] = await anchor.web3.PublicKey
      .findProgramAddress(
          claimSeeds,
          programId,
    );

    let tx4 = new anchor.web3.Transaction();

    const args = {
      claimIdx: claimIdx,
      amount: new anchor.BN(1)
    }

    tx4.add(
      await program.methods.makeClaim(args.claimIdx, args.amount).accounts({
        subscriber: subscriber.publicKey,
        enrollment: enrollmentPda,
        claim: claimPda
      }).instruction()
    )

    await provider.sendAndConfirm(tx4, [subscriber])
    console.log("Success!", tx4);
  })

});
