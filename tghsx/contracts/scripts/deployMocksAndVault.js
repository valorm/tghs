const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // 1. Deploy mock price feeds
  const Mock = await hre.ethers.getContractFactory("MockV3Aggregator");
  
  // ETH/USD feed: $2,500 with 8 decimals
  const ethFeed = await Mock.deploy(8, 2_500_000_000);
  await ethFeed.waitForDeployment();
  const ethFeedAddress = await ethFeed.getAddress();
  console.log("Mock ETH/USD feed deployed at:", ethFeedAddress);

  // GHS/USD feed: $0.075 with 8 decimals
  const ghsFeed = await Mock.deploy(8, 7_500_000);
  await ghsFeed.waitForDeployment();
  const ghsFeedAddress = await ghsFeed.getAddress();
  console.log("Mock GHS/USD feed deployed at:", ghsFeedAddress);

  // 2. Deploy TGHSX token
  const Token = await hre.ethers.getContractFactory("TGHXToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("TGHSX token deployed at:", tokenAddress);

  // 3. Deploy CollateralVault
  const Vault = await hre.ethers.getContractFactory("CollateralVault");
  const vault = await Vault.deploy(
    ethFeedAddress,
    ghsFeedAddress,
    tokenAddress
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("CollateralVault deployed at:", vaultAddress);

  // 4. Grant MINTER_ROLE to vault
  const grantTx = await token.grantRole(
    await token.MINTER_ROLE(),
    vaultAddress
  );
  await grantTx.wait();
  console.log("Vault granted MINTER_ROLE on token");

  // 5. Verify setup
  console.log("\nDeployment Summary:");
  console.log("ETH Feed:", ethFeedAddress);
  console.log("GHS Feed:", ghsFeedAddress);
  console.log("Token:", tokenAddress);
  console.log("Vault:", vaultAddress);
  console.log("Vault has MINTER_ROLE:", await token.hasRole(
    await token.MINTER_ROLE(),
    vaultAddress
  ));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});