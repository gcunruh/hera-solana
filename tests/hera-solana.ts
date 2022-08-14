import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { HeraSolana } from "../target/types/hera_solana";

describe("hera-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.HeraSolana as Program<HeraSolana>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
