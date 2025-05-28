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
});
