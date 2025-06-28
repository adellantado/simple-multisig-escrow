const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Polygon mainnet configuration
const POLYGON_RPC_URL = "https://polygon-rpc.com";
const FACTORY_ADDRESS = "0xDF078a36C7ED2361Aa83846B6F9A3F76c98EE689";

// Load ABI
const factoryABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/abi/MultisigEscrowFactory.json"), "utf8")
);

async function debugEscrowCreation(beneficiaryAddress, deadlineDays, amountInPol) {
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  console.log("🔗 Connecting to Polygon Mainnet...");
  
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
  
  console.log("✅ Connected to factory at:", FACTORY_ADDRESS);
  console.log("👤 Wallet:", wallet.address);
  
  const deadline = Math.floor(Date.now() / 1000) + (deadlineDays * 24 * 60 * 60);
  const amountInWei = ethers.parseEther(amountInPol.toString());
  
  console.log("\n📋 Transaction Details:");
  console.log("Beneficiary:", beneficiaryAddress);
  console.log("Deadline:", deadline);
  console.log("Amount in Wei:", amountInWei.toString());
  
  // Check if the contract exists and is callable
  const code = await provider.getCode(FACTORY_ADDRESS);
  console.log("Contract code exists:", code !== "0x");
  
  // Get the function signature
  const functionData = factory.interface.encodeFunctionData("createEscrow", [
    beneficiaryAddress,
    deadline
  ]);
  
  console.log("Function data:", functionData);
  
  // Estimate gas
  try {
    const gasEstimate = await factory.createEscrow.estimateGas(beneficiaryAddress, deadline, {
      value: amountInWei
    });
    console.log("Gas estimate:", gasEstimate.toString());
  } catch (error) {
    console.error("Gas estimation failed:", error.message);
  }
  
  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "POL");
  
  if (balance < amountInWei) {
    console.error("❌ Insufficient balance");
    return;
  }
  
  console.log("\n Creating escrow...");
  
  try {
    const tx = await factory.createEscrow(beneficiaryAddress, deadline, {
      value: amountInWei,
      gasLimit: 5000000
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Transaction data:", tx.data);
    
    const receipt = await tx.wait();
    console.log("Status:", receipt.status);
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Run with command line args
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.log("Usage: node scripts/debug_polygon_escrow.js <beneficiary> <days> <amount>");
  process.exit(1);
}

debugEscrowCreation(args[0], parseInt(args[1]), parseFloat(args[2]))
  .catch(console.error); 