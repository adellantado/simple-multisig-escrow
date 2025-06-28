import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre from "hardhat";
  import { ethers } from "hardhat";
  import { MultisigEscrow } from "../typechain-types";


  describe("MultisigEscrowFactory", function () {

    const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

    async function deployEscrowFixture() {
      const [owner, depositor, beneficiary, someone] = await hre.ethers.getSigners();  
      const MultisigEscrowFactory = await hre.ethers.getContractFactory("MultisigEscrowFactory");
      const escrowFactory = await MultisigEscrowFactory.deploy();
      return { escrowFactory, owner, depositor, beneficiary, someone };
    }

    describe("Create escrow", () => {

        it("Should deploy escrow", async () => {
            const { escrowFactory, owner, depositor, beneficiary } = await loadFixture(deployEscrowFixture);
            const value = hre.ethers.parseEther("1.1");
            const deadline = 1000;
            // check created event
            const tx = await escrowFactory.connect(depositor).createEscrow(beneficiary, deadline, {value: value});
            const receipt = await tx.wait();
            const event = receipt?.logs.find(log => {
                try {
                    return escrowFactory.interface.parseLog(log as any)?.name === "EscrowCreated";
                } catch {
                    return false;
                }
            });
            const escrowAddress = escrowFactory.interface.parseLog(event as any)?.args[0];
            
            await expect(tx).to.emit(escrowFactory, "EscrowCreated")
                .withArgs(escrowAddress, depositor, beneficiary);
            // check funds moved
            await expect(tx).to.changeEtherBalances(
                [depositor, escrowAddress],
                [-value, value]
            );
        });

    });
  })