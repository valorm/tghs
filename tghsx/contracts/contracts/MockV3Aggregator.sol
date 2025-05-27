// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockV3Aggregator is AggregatorV3Interface {
    uint8 public decimals;
    int256 private latestAnswer;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        latestAnswer = _initialAnswer;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80, int256 answer, uint256, uint256, uint80
        )
    {
        return (0, latestAnswer, 0, 0, 0);
    }

    function getRoundData(uint80)
        external
        view
        override
        returns (
            uint80, int256, uint256, uint256, uint80
        )
    {
        revert("not implemented");
    }

    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function setLatestAnswer(int256 _answer) external {
        latestAnswer = _answer;
    }
}
