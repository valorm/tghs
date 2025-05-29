const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Executing with account:", deployer.address);

  // Replace these with your actual contract addresses
  const tokenAddress = "0xFC830b2e7a1822Fa1Ef002b46D16C764F88A6c62";
  const vaultAddress = "0x9db72B36E80F7f8DCd858a7BBf0132EF1B118177";

  // 1. Get token contract instance
  const Token = await hre.ethers.getContractFactory("TGHXToken");
  const token = Token.attach(tokenAddress);

  // 2. Check current role status
  const MINTER_ROLE = await token.MINTER_ROLE();
  const hasRoleBefore = await token.hasRole(MINTER_ROLE, vaultAddress);
  console.log(`Vault has MINTER_ROLE before revocation: ${hasRoleBefore}`);

  // 3. Revoke the role
  if (hasRoleBefore) {
    console.log("Revoking MINTER_ROLE from vault...");
    const revokeTx = await token.revokeRole(MINTER_ROLE, vaultAddress);
    await revokeTx.wait();
    console.log("MINTER_ROLE revoked successfully");
  } else {
    console.log("Vault does not have MINTER_ROLE. No action needed.");
  }

  // 4. Verify revocation
  const hasRoleAfter = await token.hasRole(MINTER_ROLE, vaultAddress);
  console.log(`Vault has MINTER_ROLE after revocation: ${hasRoleAfter}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});