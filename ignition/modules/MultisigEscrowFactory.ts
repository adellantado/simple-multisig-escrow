import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultisigEscrowFactoryModule = buildModule("MultisigEscrowFactoryModule", (m) => {

  const escrow = m.contract("MultisigEscrowFactory");

  return { escrow };
});

export default MultisigEscrowFactoryModule;
