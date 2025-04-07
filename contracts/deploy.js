const hre = require("hardhat");

async function main() {
  console.log("🚀 Deployment script started...");

  const HealthcareDataset = await hre.ethers.getContractFactory(
    "HealthcareDataset"
  );
  console.log("🔄 Contract factory retrieved, deploying...");

  const contract = await HealthcareDataset.deploy();
  console.log("⏳ Waiting for deployment confirmation...");

  await contract.waitForDeployment();
  console.log("✅ Contract successfully deployed!");

  console.log("📍 Contract deployed at:", await contract.getAddress());
}

main()
  .then(() => {
    console.log("🚀 Deployment script finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });