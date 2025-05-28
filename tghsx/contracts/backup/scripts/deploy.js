const hre = require("hardhat")

async function main() {
  const TGHXToken = await hre.ethers.getContractFactory("TGHXToken")
  const token = await TGHXToken.deploy()
  await token.waitForDeployment()

  console.log("TGHXToken deployed to:", await token.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
