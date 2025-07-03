import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre from "hardhat";
  import { ethers } from "hardhat";
  import { MultisigEscrow, MultisigEscrowFactory } from "../typechain-types";


  describe("MultisigEscrow", function () {

    const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

    async function deployEscrowFixture() {
      const [owner, depositor, beneficiary, someone] = await hre.ethers.getSigners();  
      const MultisigEscrowFactory = await hre.ethers.getContractFactory("MultisigEscrowFactory");
      const factory = await MultisigEscrowFactory.deploy();
      return { factory, owner, depositor, beneficiary, someone };
    }

    async function createEscrowFixture() {
      const { factory, owner, depositor, beneficiary, someone } = await loadFixture(deployEscrowFixture);
      const deadlineDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const value = hre.ethers.parseEther("0.1");
      
      const tx = await factory.connect(depositor).createEscrow(beneficiary, deadlineDate, { value: value });
      const receipt = await tx.wait();
      
      // Get the escrow address from the event
      const event = receipt?.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "EscrowCreated";
        } catch {
          return false;
        }
      });
      
      if (!event) {
        throw new Error("EscrowCreated event not found");
      }
      
      const parsedEvent = factory.interface.parseLog(event);
      if (!parsedEvent) {
        throw new Error("Failed to parse EscrowCreated event");
      }
      const escrowAddress = parsedEvent.args.escrow;
      const escrow = await hre.ethers.getContractAt("MultisigEscrow", escrowAddress);
      
      return { factory, escrow, owner, depositor, beneficiary, someone, value, deadlineDate };
    }

    async function activeEscrowFixture() {
      const { factory, escrow, owner, depositor, beneficiary, someone, value, deadlineDate } = await loadFixture(createEscrowFixture);
      await escrow.connect(beneficiary).approveAgreement();
      return { factory, escrow, owner, depositor, beneficiary, someone, value, deadlineDate };
    }

    async function lockedEscrowFixture() {
      const { factory, escrow, owner, depositor, beneficiary, someone, value, deadlineDate } = await loadFixture(activeEscrowFixture);
      await time.increase(86400 + 1); // Pass deadline
      await escrow.connect(depositor).lockFunds();
      return { factory, escrow, owner, depositor, beneficiary, someone, value, deadlineDate };
    }

    describe("Escrow Creation", () => {
      it("Should create a new escrow agreement", async () => {
        const { factory, depositor, beneficiary } = await loadFixture(deployEscrowFixture);
        const deadlineDate = Math.floor(Date.now() / 1000) + 86400;
        const value = hre.ethers.parseEther("0.1");

        const tx = await factory.connect(depositor).createEscrow(beneficiary, deadlineDate, { value: value });
        const receipt = await tx.wait();

        const event = receipt?.logs.find(log => {
          try {
              return factory.interface.parseLog(log as any)?.name === "EscrowCreated";
          } catch {
              return false;
          }
      });
      const escrowAddress = factory.interface.parseLog(event as any)?.args[0];

        await expect(tx).to.emit(factory, "EscrowCreated")
          .withArgs(escrowAddress, depositor, beneficiary);

        // Check funds moved
        await expect(tx).to.changeEtherBalances(
          [depositor, escrowAddress],
          [-value, value]
        );
      });

      it("Should NOT create escrow with zero beneficiary address", async () => {
        const { factory, depositor } = await loadFixture(deployEscrowFixture);
        const deadlineDate = Math.floor(Date.now() / 1000) + 86400;
        const value = hre.ethers.parseEther("0.1");

        await expect(
          factory.connect(depositor).createEscrow(EMPTY_ADDRESS, deadlineDate, { value: value })
        ).to.be.revertedWith("zero address");
      });

      it("Should allow depositor to add funds to funded escrow", async () => {
        const { escrow, depositor, value } = await loadFixture(createEscrowFixture);
        const additionalValue = hre.ethers.parseEther("0.05");

        const tx = await depositor.sendTransaction({
          to: escrow.target,
          value: additionalValue
        });

        await expect(tx).to.emit(escrow, "FundsAdded")
          .withArgs(additionalValue, value + additionalValue);
      });

      it("Should NOT allow non-depositor to add funds", async () => {
        const { escrow, beneficiary, someone } = await loadFixture(createEscrowFixture);
        const value = hre.ethers.parseEther("0.05");

        await expect(
          beneficiary.sendTransaction({
            to: escrow.target,
            value: value
          })
        ).to.be.revertedWith("only depositor");

        await expect(
          someone.sendTransaction({
            to: escrow.target,
            value: value
          })
        ).to.be.revertedWith("only depositor");
      });
    });

    describe("Agreement Management", () => {
      it("Depositor should revoke agreement", async () => {
        const { escrow, depositor } = await loadFixture(createEscrowFixture);

        await expect(escrow.connect(depositor).revokeAgreement())
          .to.emit(escrow, "AgreementRevoked");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(1); // Revoked
      });

      it("Beneficiary should approve agreement", async () => {
        const { escrow, beneficiary } = await loadFixture(createEscrowFixture);

        await expect(escrow.connect(beneficiary).approveAgreement())
          .to.emit(escrow, "AgreementApproved");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(3); // Active
      });

      it("Beneficiary should reject agreement", async () => {
        const { escrow, beneficiary } = await loadFixture(createEscrowFixture);

        await expect(escrow.connect(beneficiary).rejectAgreement())
          .to.emit(escrow, "AgreementRejected");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(2); // Rejected
      });

      it("Should NOT allow wrong roles to call agreement functions", async () => {
        const { escrow, depositor, beneficiary, someone } = await loadFixture(createEscrowFixture);

        // Non-depositor cannot revoke
        await expect(escrow.connect(beneficiary).revokeAgreement())
          .to.be.revertedWith("only depositor");

        // Non-beneficiary cannot approve
        await expect(escrow.connect(depositor).approveAgreement())
          .to.be.revertedWith("only beneficiary");

        // Non-beneficiary cannot reject
        await expect(escrow.connect(depositor).rejectAgreement())
          .to.be.revertedWith("only beneficiary");
      });
    });

    describe("Fund Management", () => {
      it("Beneficiary should refund agreement", async () => {
        const { escrow, beneficiary } = await loadFixture(activeEscrowFixture);

        await expect(escrow.connect(beneficiary).refundAgreement())
          .to.emit(escrow, "AgreementRefunded");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(4); // Refunded
      });

      it("Depositor should release funds", async () => {
        const { escrow, depositor } = await loadFixture(activeEscrowFixture);

        await expect(escrow.connect(depositor).releaseFunds())
          .to.emit(escrow, "FundsReleased");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(5); // Closed
      });

      it("Beneficiary should release funds after deadline + 3 days", async () => {
        const { escrow, beneficiary } = await loadFixture(activeEscrowFixture);
        
        // Wait for deadline + 3 days
        await time.increase(86400 + (3 * 24 * 3600) + 1);

        await expect(escrow.connect(beneficiary).releaseFunds())
          .to.emit(escrow, "FundsReleased");
      });

      it("Beneficiary should NOT release funds before deadline + 3 days", async () => {
        const { escrow, beneficiary } = await loadFixture(activeEscrowFixture);
        
        // Wait for deadline but not 3 days after
        await time.increase(86400 + 1);

        await expect(escrow.connect(beneficiary).releaseFunds())
          .to.be.revertedWith("can be released after: deadline + 3 days");
      });

      it("Beneficiary should withdraw funds from closed agreement after 3 days", async () => {
        const { escrow, beneficiary, value } = await loadFixture(activeEscrowFixture);
        
        // Wait for deadline + 3 days
        await time.increase(86400 + (3 * 24 * 3600) + 1);

        // Release funds first
        const releaseFundsData = escrow.interface.encodeFunctionData("releaseFunds");
        const withdrawFundsData = escrow.interface.encodeFunctionData("withdrawFunds");
        const tx = await escrow.connect(beneficiary).multicall([releaseFundsData, withdrawFundsData]);

        await expect(tx).to.emit(escrow, "FundsWithdrawn")
          .withArgs(beneficiary, 0);

        await expect(tx).to.changeEtherBalances(
          [beneficiary, escrow],
          [value, -value]
        );
      });

      it("Depositor should remove funds from revoked/rejected/refunded agreement", async () => {
        const { escrow, depositor, value } = await loadFixture(createEscrowFixture);
      
        // Revoke agreement
        await escrow.connect(depositor).revokeAgreement();

        const tx = await escrow.connect(depositor).removeFunds();

        await expect(tx).to.emit(escrow, "FundsWithdrawn")
          .withArgs(depositor, 0);

        await expect(tx).to.changeEtherBalances(
          [depositor, escrow],
          [value, -value]
        );
      });
    });

    describe("Fund Locking and Multisig", () => {
      it("Depositor should lock funds after deadline", async () => {
        const { escrow, depositor } = await loadFixture(activeEscrowFixture);
        
        // Wait for deadline
        await time.increase(86400 + 1);

        await expect(escrow.connect(depositor).lockFunds())
          .to.emit(escrow, "FundsLocked");

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(6); // Locked
      });

      it("Depositor should NOT lock funds before deadline", async () => {
        const { escrow, depositor } = await loadFixture(activeEscrowFixture);

        await expect(escrow.connect(depositor).lockFunds())
          .to.be.revertedWith("can be locked after deadline during 3 days");
      });

      it("Beneficiary should set multisig address", async () => {
        const { escrow, beneficiary, someone } = await loadFixture(lockedEscrowFixture);

        await expect(escrow.connect(beneficiary).setMultisig(someone))
          .to.emit(escrow, "MultisigSet")
          .withArgs(someone);
      });

      it("Should NOT set multisig with zero address", async () => {
        const { escrow, beneficiary } = await loadFixture(lockedEscrowFixture);

        await expect(escrow.connect(beneficiary).setMultisig(EMPTY_ADDRESS))
          .to.be.revertedWith("zero address");
      });

      it("Depositor should approve multisig", async () => {
        const { escrow, depositor, beneficiary, someone } = await loadFixture(lockedEscrowFixture);
        
        // Set multisig first
        await escrow.connect(beneficiary).setMultisig(someone);

        await expect(escrow.connect(depositor).approveMultisig())
          .to.emit(escrow, "MultisigApproved")
          .withArgs(someone);
      });

      it("Should NOT approve multisig when not set", async () => {
        const { escrow, depositor } = await loadFixture(lockedEscrowFixture);

        await expect(escrow.connect(depositor).approveMultisig())
          .to.be.revertedWith("multisig not set");
      });

      it("Multisig should compensate agreement", async () => {
        const { escrow, depositor, beneficiary, someone, value } = await loadFixture(lockedEscrowFixture);
        
        // Set and approve multisig
        await escrow.connect(beneficiary).setMultisig(someone);
        await escrow.connect(depositor).approveMultisig();

        const compensationAmount = hre.ethers.parseEther("0.05");

        const tx = await escrow.connect(someone).compensateAgreement(compensationAmount);

        await expect(tx).to.emit(escrow, "FundsCompensated")
          .withArgs(compensationAmount);

        await expect(tx).to.changeEtherBalances(
          [depositor, escrow],
          [compensationAmount, -compensationAmount]
        );

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(5); // Closed
      });
    });

    describe("Agreement Details", () => {
      it("Should return correct agreement details", async () => {
        const { escrow, depositor, beneficiary, value, deadlineDate } = await loadFixture(createEscrowFixture);

        const details = await escrow.connect(depositor).getAgreementDetails();
        
        expect(details[0]).to.equal(value); // balance
        expect(details[1]).to.be.closeTo(Math.floor(Date.now() / 1000), 10); // startDate
        expect(details[2]).to.equal(deadlineDate); // deadlineDate
        expect(details[3]).to.equal(0); // status (Funded)
        expect(details[4]).to.equal(depositor); // depositor
        expect(details[5]).to.equal(beneficiary); // beneficiary
        expect(details[6]).to.equal(EMPTY_ADDRESS); // multisig
        expect(details[7]).to.equal(false); // approved
      });

      it("Should return correct agreement status", async () => {
        const { escrow } = await loadFixture(createEscrowFixture);

        const status = await escrow.getAgreementStatus();
        expect(status).to.equal(0); // Funded
      });
    });

    describe("Contract Pausing", () => {
      it("Contract should be paused when no funds", async () => {
        const { escrow, depositor } = await loadFixture(createEscrowFixture);
        
        // Revoke and remove funds
        await escrow.connect(depositor).revokeAgreement();
        await escrow.connect(depositor).removeFunds();

        await expect(await escrow.paused()).to.be.true;
      });

      it("Should NOT pause contract with funds", async () => {
        const { escrow, depositor } = await loadFixture(createEscrowFixture);
        
        // Revoke but don't remove funds
        await escrow.connect(depositor).revokeAgreement();

        await expect(escrow.connect(depositor).pause())
          .to.be.revertedWith("withdraw funds to pause");
      });

      it("Should create new agreement after pausing", async () => {
        const { escrow, depositor, someone } = await loadFixture(createEscrowFixture);
        
        // Revoke, remove funds, and pause
        await escrow.connect(depositor).revokeAgreement();
        await escrow.connect(depositor).removeFunds();

        const newDeadline = Math.floor(Date.now() / 1000) + 86400;
        const value = hre.ethers.parseEther("0.2");

        await expect(escrow.connect(depositor).createAgreement(someone, newDeadline, { value: value }))
          .to.emit(escrow, "AgreementCreated")
          .withArgs(depositor, someone, value, newDeadline);
      });
    });
  });