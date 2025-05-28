const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralVault", () => {
  let vault, mockEthFeed, mockGhsFeed, usdtToken, token, deployer, user;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();

    // Deploy mock price feeds
    const MockAggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockEthFeed = await MockAggregator.deploy(8, 250000000); // ETH/USD = 2500
    await mockEthFeed.waitForDeployment();

    mockGhsFeed = await MockAggregator.deploy(8, 7500000); // GHS/USD = 0.075
    await mockGhsFeed.waitForDeployment();

    // Deploy mock USDT (6 decimals)
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdtToken = await MockUSDT.deploy("Mock USDT", "USDT", 6);
    await usdtToken.waitForDeployment();

    // Deploy tGHSX token (18 decimals, burnable)
    const TGHXToken = await ethers.getContractFactory("TGHXToken");
    token = await TGHXToken.deploy();
    await token.waitForDeployment();

    // Deploy vault with 3 arguments
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    vault = await CollateralVault.deploy(
      await mockEthFeed.getAddress(),
      await mockGhsFeed.getAddress(),
      await token.getAddress()
    );
    await vault.waitForDeployment();

    // Fund user with USDT
    await usdtToken.mint(user.address, ethers.parseUnits("1000", 6));
  });

  it("should accept ETH deposits and emit event", async () => {
    await expect(
      vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    )
      .to.emit(vault, "DepositETH")
      .withArgs(user.address, ethers.parseEther("1"));

    const balance = await vault.ethDeposits(user.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });

  it("should accept USDT deposits and emit event", async () => {
    await usdtToken
      .connect(user)
      .approve(await vault.getAddress(), ethers.parseUnits("100", 6));

    await expect(
      vault
        .connect(user)
        .depositUSDT(ethers.parseUnits("100", 6), await usdtToken.getAddress())
    )
      .to.emit(vault, "DepositUSDT")
      .withArgs(user.address, ethers.parseUnits("100", 6));

    const balance = await vault.usdtDeposits(user.address);
    expect(balance).to.equal(ethers.parseUnits("100", 6));
  });

  it("should calculate ETH value in GHS", async () => {
    await vault.connect(user).depositETH({ value: ethers.parseEther("1") });
    const ghsValue = await vault.getETHValueInGHS(user.address);
    expect(ghsValue).to.equal("33333333333333333333"); // 1 ETH = 2500 USD → 33.33 GHS
  });

  it("should calculate USDT value in GHS", async () => {
    await usdtToken
      .connect(user)
      .approve(await vault.getAddress(), ethers.parseUnits("150", 6));
    await vault
      .connect(user)
      .depositUSDT(ethers.parseUnits("150", 6), await usdtToken.getAddress());
    const ghsValue = await vault.getUSDTValueInGHS(user.address);
    expect(ghsValue).to.equal("2000000000"); // 150 USDT = 2000 GHS
  });

  it("should burn tGHSX tokens and emit event", async () => {
    const amount = ethers.parseUnits("100", 18);

    // Mint tGHSX to user and approve vault
    await token.connect(deployer).mint(user.address, amount);
    await token.connect(user).approve(await vault.getAddress(), amount);

    // Burn tokens through the vault
    const tx = await vault.connect(user).burn(amount);

    await expect(tx)
      .to.emit(vault, "TokenBurned")
      .withArgs(user.address, amount);

    const balance = await token.balanceOf(user.address);
    expect(balance).to.equal(0n);
  });

  it("should unlock ETH after burn if collateral ratio is maintained", async () => {
  const ethDeposit = ethers.parseEther("1"); // 2500 USD = 33.33 GHS
  const mintAmount = ethers.parseUnits("20", 18); // 20 tGHSX
  const unlockAmount = ethers.parseEther("0.25"); // 25% of ETH = ~6.66 GHS

  // Deposit ETH
  await vault.connect(user).depositETH({ value: ethDeposit });

  // Mint tGHSX and approve for burn
  await token.connect(deployer).mint(user.address, mintAmount);
  await token.connect(user).approve(vault.getAddress(), mintAmount);
  await vault.connect(user).burn(mintAmount); // burn to unlock collateral

  // Unlock ETH
  const tx = await vault.connect(user).unlockETH(unlockAmount);

  await expect(tx)
    .to.emit(vault, "CollateralUnlocked")
    .withArgs(user.address, "ETH", unlockAmount);
});

it("should block deposits and burns while paused", async () => {
  await vault.connect(deployer).pause();

  // ETH deposit should fail
  await expect(
    vault.connect(user).depositETH({ value: ethers.parseEther("1") })
  ).to.be.revertedWith("Pausable: paused");

  // USDT deposit should fail
  await usdtToken.connect(user).approve(vault.getAddress(), ethers.parseUnits("10", 6));
  await expect(
    vault.connect(user).depositUSDT(ethers.parseUnits("10", 6), await usdtToken.getAddress())
  ).to.be.revertedWith("Pausable: paused");

  // tGHSX burn should fail
  const amount = ethers.parseUnits("10", 18);
  await token.connect(deployer).mint(user.address, amount);
  await token.connect(user).approve(vault.getAddress(), amount);

  await expect(vault.connect(user).burn(amount)).to.be.revertedWith("Pausable: paused");
});

it("should allow PAUSER_ROLE to pause and unpause", async () => {
  // Confirm vault is initially unpaused
  expect(await vault.paused()).to.equal(false);

  // Pause the contract
  await vault.connect(deployer).pause();
  expect(await vault.paused()).to.equal(true);

  // Unpause the contract
  await vault.connect(deployer).unpause();
  expect(await vault.paused()).to.equal(false);
});

it("should revert USDT unlock if it violates collateral ratio", async () => {
  const deposit = ethers.parseUnits("150", 6); // 150 USDT = 2000 GHS
  const mintAmount = ethers.parseUnits("1400", 18); // total minted
  const burnAmount = ethers.parseUnits("1000", 18); // user still holds 400
  const unlock = ethers.parseUnits("100", 6); // try to unlock ~1333 GHS

  // Approve and deposit USDT
  await usdtToken.connect(user).approve(vault.getAddress(), deposit);
  await vault.connect(user).depositUSDT(deposit, await usdtToken.getAddress());

  // Mint and burn only part of it
  await token.connect(deployer).mint(user.address, mintAmount);
  await token.connect(user).approve(vault.getAddress(), burnAmount);
  await vault.connect(user).burn(burnAmount); // still holding 400

  // Now test unlock fails due to remaining balance
  await expect(
    vault.connect(user).unlockUSDT(unlock, await usdtToken.getAddress())
  ).to.be.revertedWith("Would break 150% collateral ratio");
});

});
