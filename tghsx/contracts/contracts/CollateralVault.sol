// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CollateralVault is Ownable {
    mapping(address => uint256) public ethDeposits;
    mapping(address => uint256) public usdtDeposits;

    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public ghsUsdPriceFeed;

    event DepositETH(address indexed user, uint256 amount);
    event DepositUSDT(address indexed user, uint256 amount);

    constructor(address _ethUsdFeed, address _ghsUsdFeed) {
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdFeed);
        ghsUsdPriceFeed = AggregatorV3Interface(_ghsUsdFeed);
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

    function getETHValueInGHS(address user) external view returns (uint256) {
        uint256 ethAmount = ethDeposits[user];
        (, int ethUsd,,,) = ethUsdPriceFeed.latestRoundData();
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        return (ethAmount * uint256(ethUsd)) / uint256(ghsUsd);
    }

    function getUSDTValueInGHS(address user) external view returns (uint256) {
        uint256 usdtAmount = usdtDeposits[user];
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        return (usdtAmount * 1e8) / uint256(ghsUsd); // USDT assumed 1:1 USD
    }
}
