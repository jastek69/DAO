const { task } = require("hardhat/config");

require("@nomicfoundation/hardhat-toolbox");
// require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const privateKeys = process.env.PRIVATE_KEYS || ""

// Hardhat Tasks
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
})

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    localhost: {},
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: privateKeys.split(','),
    },
    canto: {
      url: `https://canto-testnet.plexnode.wtf`,
      accounts: privateKeys.split(',' ),
    },
  },
  etherscan: {
    apiKey: {
        sepolia:process.env.ETHERSCAN_API_KEY},
    }
};
