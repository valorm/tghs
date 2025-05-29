const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("CollateralVault", () => {
  let vault, mockEthFeed, mockGhsFeed, token, deployer, user

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners()

    const MockAggregator = await ethers.getContractFactory("MockV3Aggregator")
    mockEthFeed = await MockAggregator.deploy(8, 250000000) // 1 ETH = 2500 USD
    mockGhsFeed = await MockAggregator.deploy(8, 7500000)   // 1 GHS = 0.075 USD

    const Token = await ethers.getContractFactory("TGHXToken")
    token = await Token.deploy()

    const Vault = await ethers.getContractFactory("CollateralVault")
    vault = await Vault.deploy(
      await mockEthFeed.getAddress(),
      await mockGhsFeed.getAddress(),
      await token.getAddress()
    )

    // Grant roles
    await token.grantRole(await token.MINTER_ROLE(), deployer.address)
    await token.grantRole(await token.MINTER_ROLE(), await vault.getAddress())
    await token.grantRole(await token.PAUSER_ROLE(), deployer.address)

    // Approve vault to burn from user
    await token.connect(deployer).mint(user.address, ethers.parseUnits("1000", 18))
    await token.connect(user).approve(await vault.getAddress(), ethers.parseUnits("1000", 18))
  })

  it("should accept ETH deposits and emit event", async () => {
    const tx = await vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    await expect(tx).to.emit(vault, "DepositETH").withArgs(user.address, ethers.parseEther("1"))
  })

  it("should calculate ETH value in GHS", async () => {
    await vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    const ghsValue = await vault.getETHValueInGHS(user.address)
    expect(ghsValue).to.equal("33333333333333333333") // 2500 / 0.075 = ~33.33 GHS
  })

  it("should burn tGHSX tokens and emit event", async () => {
    const burnAmount = ethers.parseUnits("500", 18)
    await expect(vault.connect(user).burn(burnAmount))
      .to.emit(vault, "TokenBurned")
      .withArgs(user.address, burnAmount)
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("500", 18))
  })

  it("should allow liquidation of undercollateralized users", async () => {
    const burnAll = await token.balanceOf(user.address)
    await vault.connect(user).depositETH({ value: ethers.parseEther("0.01") })

    // Confirm user is undercollateralized
    expect(await vault.isUndercollateralized(user.address)).to.equal(true)

    // Liquidate
    await expect(vault.connect(deployer).liquidate(user.address))
      .to.emit(vault, "Liquidated")

    // After liquidation, user should have 0 balance and vault reset
    expect(await vault.ethDeposits(user.address)).to.equal(0)
    expect(await token.balanceOf(user.address)).to.equal(0)
  })

  it("should block deposits and burns while paused", async () => {
    await vault.connect(deployer).pause()

    await expect(
      vault.connect(user).depositETH({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Pausable: paused")

    await expect(
      vault.connect(user).burn(ethers.parseUnits("100", 18))
    ).to.be.revertedWith("Pausable: paused")
  })

  it("should allow PAUSER_ROLE to pause and unpause", async () => {
    await vault.connect(deployer).pause()
    expect(await vault.paused()).to.equal(true)

    await vault.connect(deployer).unpause()
    expect(await vault.paused()).to.equal(false)
  })
})
