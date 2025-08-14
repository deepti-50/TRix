require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { SEPOLIA_URL, MUMBAI_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.23",
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: SEPOLIA_URL && PRIVATE_KEY ? { url: SEPOLIA_URL, accounts: [PRIVATE_KEY] } : undefined,
    polygonMumbai: MUMBAI_URL && PRIVATE_KEY ? { url: MUMBAI_URL, accounts: [PRIVATE_KEY] } : undefined
  },
  etherscan: { apiKey: process.env.ETHERSCAN_KEY || "" }
};