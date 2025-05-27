const hre = require("hardhat");

async function main() {
  const address = "0x647a2cAc5ae22aDcC97118D20928204050215214";
  const token = await hre.ethers.getContractAt("TGHXToken", address);

  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
