const hre = require("hardhat");

async function main() {
    console.log("🚀 Deployment script started...");

    // Get the contract factory
    const HealthcareDataset = await hre.ethers.getContractFactory("HealthcareDataset");
    console.log("🔄 Contract factory retrieved, deploying...");

    // Deploy the contract
    const contract = await HealthcareDataset.deploy();
    console.log("⏳ Waiting for deployment confirmation...");

    // Wait for deployment confirmation
    await contract.waitForDeployment();
    console.log("✅ Contract successfully deployed!");

    // Get contract address
    console.log("📍 Contract deployed at:", contract.target);
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

