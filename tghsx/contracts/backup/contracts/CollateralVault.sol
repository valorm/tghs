// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CollateralVault is Ownable, ReentrancyGuard {
    mapping(address => uint256) public ethDeposits;
    mapping(address => uint256) public usdtDeposits;

    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public ghsUsdPriceFeed;

    ERC20Burnable public tghsxToken;

    event DepositETH(address indexed user, uint256 amount);
    event DepositUSDT(address indexed user, uint256 amount);
    event TokenBurned(address indexed user, uint256 amount);

    constructor(
        address _ethUsdFeed,
        address _ghsUsdFeed,
        address _tghsxToken
    ) {
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdFeed);
        ghsUsdPriceFeed = AggregatorV3Interface(_ghsUsdFeed);
        tghsxToken = ERC20Burnable(_tghsxToken);
    }

    function depositETH() external payable {
        require(msg.value > 0, "Must send ETH");
        ethDeposits[msg.sender] += msg.value;
        emit DepositETH(msg.sender, msg.value);
    }

    function depositUSDT(uint256 amount, address usdtToken) external {
        require(amount > 0, "Amount must be > 0");
        IERC20(usdtToken).transferFrom(msg.sender, address(this), amount);
        usdtDeposits[msg.sender] += amount;
        emit DepositUSDT(msg.sender, amount);
    }

    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        // Must approve this contract to burn tokens on user's behalf
        tghsxToken.burnFrom(msg.sender, amount);

        emit TokenBurned(msg.sender, amount);
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

        // USDT assumed 1 USD = 1e8 (Chainlink decimals)
        return (usdtAmount * 1e8) / uint256(ghsUsd);
    }
}
