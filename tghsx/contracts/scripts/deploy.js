const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy TGHXToken
  const TGHXToken = await hre.ethers.getContractFactory("TGHXToken");
  const token = await TGHXToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("TGHXToken deployed to:", tokenAddress);

  // Chainlink mock feed addresses on Amoy
  const ethUsdFeed = "0xf0a35DD41c2AEb5016FE19e28b027519F5968eF9"; // Mock ETH/USD
  const ghsUsdFeed = "0xE06e0f832a509ca6acC1D822eF41A96a05Fd42e5"; // Mock GHS/USD

  // Deploy CollateralVault
  const Vault = await hre.ethers.getContractFactory("CollateralVault");
  const vault = await Vault.deploy(ethUsdFeed, ghsUsdFeed, tokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("CollateralVault deployed to:", vaultAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
