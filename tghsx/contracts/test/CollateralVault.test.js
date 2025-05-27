const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("CollateralVault", () => {
  let vault, mockEthFeed, mockGhsFeed, usdtToken, deployer, user

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners()

    // Deploy mocks
    const MockAggregator = await ethers.getContractFactory("MockV3Aggregator")
    mockEthFeed = await MockAggregator.deploy(8, 250000000) // $2,500
    await mockEthFeed.waitForDeployment()

    mockGhsFeed = await MockAggregator.deploy(8, 7500000) // $0.075
    await mockGhsFeed.waitForDeployment()

    // Deploy test USDT token
    const MockUSDT = await ethers.getContractFactory("MockUSDT")
    usdtToken = await MockUSDT.deploy("Mock USDT", "USDT", 6)
    await usdtToken.waitForDeployment()

    // Deploy vault
    const CollateralVault = await ethers.getContractFactory("CollateralVault")
    vault = await CollateralVault.deploy(
      await mockEthFeed.getAddress(),
      await mockGhsFeed.getAddress()
    )
    await vault.waitForDeployment()

    // Fund user with USDT
    await usdtToken.mint(user.address, ethers.parseUnits("1000", 6))
  })

  it("should accept ETH deposits and emit event", async () => {
    await expect(
      vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    )
      .to.emit(vault, "DepositETH")
      .withArgs(user.address, ethers.parseEther("1"))

    const balance = await vault.ethDeposits(user.address)
    expect(balance).to.equal(ethers.parseEther("1"))
  })

  it("should accept USDT deposits and emit event", async () => {
    await usdtToken.connect(user).approve(vault.getAddress(), ethers.parseUnits("100", 6))

    await expect(
      vault.connect(user).depositUSDT(ethers.parseUnits("100", 6), await usdtToken.getAddress())
    )
      .to.emit(vault, "DepositUSDT")
      .withArgs(user.address, ethers.parseUnits("100", 6))

    const balance = await vault.usdtDeposits(user.address)
    expect(balance).to.equal(ethers.parseUnits("100", 6))
  })

  it("should calculate ETH value in GHS", async () => {
    await vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    const ghsValue = await vault.getETHValueInGHS(user.address)
    expect(ghsValue).to.equal("33333333333333333333") // 1 ETH = 2500 USD → 33.33 GHS
  })

  it("should calculate USDT value in GHS", async () => {
    await usdtToken.connect(user).approve(vault.getAddress(), ethers.parseUnits("150", 6))
    await vault.connect(user).depositUSDT(ethers.parseUnits("150", 6), await usdtToken.getAddress())
    const ghsValue = await vault.getUSDTValueInGHS(user.address)
    expect(ghsValue).to.equal("2000000000") // 150 USDT = 2000 GHS
  })
})
