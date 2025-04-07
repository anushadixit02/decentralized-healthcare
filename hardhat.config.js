require("dotenv").config({ path: "./backend/.env" });
require("@nomicfoundation/hardhat-ethers");

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  solidity: "0.8.28",
};