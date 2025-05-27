const hre = require("hardhat")

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log("Deploying contracts with:", deployer.address)

  // Deploy mock ETH/USD feed ($2500, 8 decimals)
  const Mock = await hre.ethers.getContractFactory("MockV3Aggregator")
  const ethFeed = await Mock.deploy(8, 250000000)
  await ethFeed.waitForDeployment()
  console.log("Mock ETH/USD feed deployed at:", await ethFeed.getAddress())

  // Deploy mock GHS/USD feed ($0.075, 8 decimals)
  const ghsFeed = await Mock.deploy(8, 7500000)
  await ghsFeed.waitForDeployment()
  console.log("Mock GHS/USD feed deployed at:", await ghsFeed.getAddress())

  // Deploy the CollateralVault
  const Vault = await hre.ethers.getContractFactory("CollateralVault")
  const vault = await Vault.deploy(
    await ethFeed.getAddress(),
    await ghsFeed.getAddress()
  )
  await vault.waitForDeployment()
  console.log("CollateralVault deployed at:", await vault.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
