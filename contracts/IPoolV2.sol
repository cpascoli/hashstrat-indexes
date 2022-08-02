// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

interface IPoolV2 {
    function totalPortfolioValue() external view returns(uint);
    function investedTokenValue() external view returns(uint);
    function depositTokenValue() external view returns(uint);

    function deposit(uint amount) external;
    function withdrawLP(uint amount) external;
}