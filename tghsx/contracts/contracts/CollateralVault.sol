// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CollateralVault is Ownable, ReentrancyGuard, Pausable, AccessControl {
    mapping(address => uint256) public ethDeposits;
    mapping(address => uint256) public usdtDeposits;

    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public ghsUsdPriceFeed;

    ERC20Burnable public tghsxToken;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event DepositETH(address indexed user, uint256 amount);
    event DepositUSDT(address indexed user, uint256 amount);
    event TokenBurned(address indexed user, uint256 amount);
    event CollateralUnlocked(address indexed user, string asset, uint256 amount);

    constructor(
        address _ethUsdFeed,
        address _ghsUsdFeed,
        address _tghsxToken
    ) {
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdFeed);
        ghsUsdPriceFeed = AggregatorV3Interface(_ghsUsdFeed);
        tghsxToken = ERC20Burnable(_tghsxToken);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function depositETH() external payable whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        ethDeposits[msg.sender] += msg.value;
        emit DepositETH(msg.sender, msg.value);
    }

    function depositUSDT(uint256 amount, address usdtToken) external whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        IERC20(usdtToken).transferFrom(msg.sender, address(this), amount);
        usdtDeposits[msg.sender] += amount;
        emit DepositUSDT(msg.sender, amount);
    }

    function burn(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        tghsxToken.burnFrom(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }

    function unlockETH(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(ethDeposits[msg.sender] >= amount, "Insufficient ETH deposited");

        (, int ethUsd,,,) = ethUsdPriceFeed.latestRoundData();
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        require(ethUsd > 0 && ghsUsd > 0, "Invalid oracle data");

        uint256 newEthBalance = ethDeposits[msg.sender] - amount;
        uint256 ghsValueAfter = (newEthBalance * uint256(ethUsd)) / uint256(ghsUsd);
        uint256 minted = tghsxToken.balanceOf(msg.sender);

        require(ghsValueAfter * 100 >= minted * 150, "Would break 150% collateral ratio");

        ethDeposits[msg.sender] = newEthBalance;
        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "ETH transfer failed");

        emit CollateralUnlocked(msg.sender, "ETH", amount);
    }

    function unlockUSDT(uint256 amount, address usdtToken) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(usdtDeposits[msg.sender] >= amount, "Insufficient USDT deposited");

        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        require(ghsUsd > 0, "Invalid oracle data");

        uint256 newUsdtBalance = usdtDeposits[msg.sender] - amount;
        uint256 ghsValueAfter = (newUsdtBalance * 1e8) / uint256(ghsUsd);
        uint256 minted = tghsxToken.balanceOf(msg.sender);

        require(ghsValueAfter * 100 >= minted * 150, "Would break 150% collateral ratio");

        usdtDeposits[msg.sender] = newUsdtBalance;
        IERC20(usdtToken).transfer(msg.sender, amount);

        emit CollateralUnlocked(msg.sender, "USDT", amount);
    }

    function getETHValueInGHS(address user) external view returns (uint256) {
        uint256 ethAmount = ethDeposits[user];
        (, int ethUsd,,,) = ethUsdPriceFeed.latestRoundData();
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        require(ethUsd > 0 && ghsUsd > 0, "Invalid oracle data");

        return (ethAmount * uint256(ethUsd)) / uint256(ghsUsd);
    }

    function getUSDTValueInGHS(address user) external view returns (uint256) {
        uint256 usdtAmount = usdtDeposits[user];
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        require(ghsUsd > 0, "Invalid oracle data");

        return (usdtAmount * 1e8) / uint256(ghsUsd); // USDT assumed 1 USD = 1e8
    }
}
