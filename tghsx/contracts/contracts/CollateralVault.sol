// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CollateralVault is AccessControl, Pausable, ReentrancyGuard {
    mapping(address => uint256) public ethDeposits;

    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public ghsUsdPriceFeed;

    ERC20Burnable public tghsxToken;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event DepositETH(address indexed user, uint256 amount);
    event TokenBurned(address indexed user, uint256 amount);
    event Liquidated(address indexed user, address indexed liquidator, uint256 burnedAmount, uint256 seizedETH);

    constructor(
        address _ethUsdFeed,
        address _ghsUsdFeed,
        address _tghsxToken
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdFeed);
        ghsUsdPriceFeed = AggregatorV3Interface(_ghsUsdFeed);
        tghsxToken = ERC20Burnable(_tghsxToken);
    }

    function depositETH() external payable whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        ethDeposits[msg.sender] += msg.value;
        emit DepositETH(msg.sender, msg.value);
    }

    function burn(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        tghsxToken.burnFrom(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }

    function getETHValueInGHS(address user) public view returns (uint256) {
        uint256 ethAmount = ethDeposits[user];
        (, int ethUsd,,,) = ethUsdPriceFeed.latestRoundData();
        (, int ghsUsd,,,) = ghsUsdPriceFeed.latestRoundData();
        require(ethUsd > 0 && ghsUsd > 0, "Invalid oracle data");
        return (ethAmount * uint256(ethUsd)) / uint256(ghsUsd);
    }

    function isUndercollateralized(address user) public view returns (bool) {
        uint256 totalCollateral = getETHValueInGHS(user);
        uint256 tokenBalance = tghsxToken.balanceOf(user);
        return totalCollateral * 100 < tokenBalance * 150;
    }

    function liquidate(address user) external whenNotPaused nonReentrant {
        require(isUndercollateralized(user), "User is not undercollateralized");

        uint256 burnAmount = tghsxToken.balanceOf(user);
        require(burnAmount > 0, "No tokens to burn");

        uint256 seizedETH = ethDeposits[user];
        require(seizedETH > 0, "No ETH collateral");

        tghsxToken.burnFrom(user, burnAmount);
        ethDeposits[user] = 0;

        (bool sent, ) = payable(msg.sender).call{ value: seizedETH }("");
        require(sent, "ETH transfer failed");

        emit Liquidated(user, msg.sender, burnAmount, seizedETH);
    }

    // Pause control
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
