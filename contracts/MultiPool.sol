//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.14;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./IPoolV2.sol";
import "./MultiPoolLPToken.sol";

contract MultiPool is Ownable {

    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);

    IERC20Metadata immutable public depositToken;
    MultiPoolLPToken immutable public lpToken;

    uint public totalDeposited = 0;
    uint public totalWithdrawn = 0;

    // depositToken token balances
    mapping (address => uint) public deposits;
    mapping (address => uint) public withdrawals;

    // users that deposited depositToken tokens into their balances
    address[] public users;
    mapping (address => bool) usersMap;

    struct PoolInfo {
        string name;
        address poolAddress;
        address lpTokenAddress;
        uint8 weight;
    }

    PoolInfo[] public pools;
    uint totalWeights;


    /**
     * Contract initialization.
     */
    constructor(address _depositTokenAddress, address _lpTokenAddress) {
        depositToken = IERC20Metadata(_depositTokenAddress);
        lpToken = MultiPoolLPToken(_lpTokenAddress);
    }


    function addPool(string memory name, address poolAddress, address lpTokenAddress, uint8 weight) external onlyOwner {
        PoolInfo memory pool = PoolInfo({
            name: name,
            poolAddress: poolAddress,
            lpTokenAddress: lpTokenAddress,
            weight: weight
        });

        pools.push(pool);
        totalWeights += pool.weight;
        console.log("Pool %s added, %s pools, totalWeights: %s", name, pools.length, totalWeights);
    }


    function deposit(uint256 amount) external {

        require(amount > 0, "Deposit amount is 0");

        // remember addresses that deposited tokens
        deposits[msg.sender] += amount;
        totalDeposited += amount;
        if (!usersMap[msg.sender]) {
            usersMap[msg.sender] = true;
            users.push(msg.sender);
        }

        // move deposit tokens in the MultiPool
        depositToken.transferFrom(msg.sender, address(this), amount);

        // calculate lptokens for this deposit based on the value of all the pools of this MultiPool
        uint lpToMint = lpTokensForDeposit(amount);

        // allocate the deposit to the pools
        uint remainingAmount = amount;
        for (uint i=0; i<pools.length; i++) {
            PoolInfo memory pool = pools[i];

            uint allocation = (i < pools.length-1) ? amount * pool.weight / totalWeights : remainingAmount;
            remainingAmount -= allocation;

            uint lpReceived = allocateToPool(pool, allocation);
            // console.log("Deposited %s into pool %s and received %s LP", allocation, pool.name, lpReceived);
            require(lpReceived > 0, "LP amount received should be > 0");
        }
      
        // mint lp tokens to the user
        // console.log("Minting %s LP to user ", lpToMint);
        lpToken.mint(msg.sender, lpToMint);

        emit Deposited(msg.sender, amount);
    }


   function withdrawLP(uint256 amount) external {

        require(amount > 0, "Withdrawal amount is 0");
        require(lpToken.totalSupply() > 0, "No LP tokens minted");
        require(amount <= lpToken.balanceOf(msg.sender), "LP balance exceeded");
  
        // calculate percentage of LP being withdrawn
        bool isWithdrawingAll = amount == lpToken.totalSupply();
        uint precision = 10 ** uint(lpToken.decimals());
        uint withdrawnPerc = precision * amount / lpToken.totalSupply();
        
        // then burn the LP for this withdrawal
        lpToken.burn(msg.sender, amount);

        // for each pool withdraw the % of LP
        for (uint i=0; i<pools.length; i++) {
            PoolInfo memory pool = pools[i];
            uint multipoolBalance = IERC20(pool.lpTokenAddress).balanceOf(address(this));
            uint withdrawAmount = isWithdrawingAll ? multipoolBalance : withdrawnPerc * multipoolBalance / precision;

            console.log("Withdrawing %s LP from Pool %s", withdrawAmount, pool.name);
            IPoolV2(pool.poolAddress).withdrawLP(withdrawAmount);
        }

        // transfer deposit tokens to user
        uint depositTokenBalanceBefore = depositToken.balanceOf(address(this));
        uint depositTokenBalanceAfter = depositToken.balanceOf(address(this));
        uint total = depositTokenBalanceAfter - depositTokenBalanceBefore;
        console.log("Withdrawn total: %s %s", total, depositToken.name());

        // remember addresses that withdrew tokens
        withdrawals[msg.sender] += total;
        totalWithdrawn += total;

        depositToken.transfer(msg.sender, total);

        emit Withdrawn(msg.sender, amount);
   }


    // returns the portfolio value in depositTokens
    function totalPoolsValue() public view returns(uint) {
        uint totalValue;
        for (uint i=0; i<pools.length; i++) {
            PoolInfo memory pool = pools[i];
            totalValue += IPoolV2(pool.poolAddress).totalPortfolioValue();
        }

        return totalValue;
    }


    // Returns the LP tokens representing the % of the value for a deposit of the given 'amount'
    function lpTokensForDeposit(uint amount) public view returns (uint) {
        uint depositLPTokens;
        
        if (lpToken.totalSupply() == 0) {
             ///// If first deposit => allocate the inital LP tokens amount to the user
            depositLPTokens = amount;
        } else {
            ///// if already have allocated LP tokens => calculate the additional LP tokens for this deposit

            // calculate portfolio % of the deposit (using lpPrecision digits precision)
            uint poolsValue = totalPoolsValue();
            require(poolsValue > 0, "Pools value is 0");

            uint lpPrecision = 10 ** uint(lpToken.decimals());
            uint depositPercentage = lpPrecision * amount / poolsValue;

            // calculate the amount of LP tokens for the deposit so that they represent 
            // a % of the existing LP tokens equivalent to the % value of this deposit to the sum of all pools value.
            // 
            // X := P * T / (1 - P)  
            //      X: additinal LP toleks to allocate to the user to account for this deposit
            //      P: Percentage of pools value accounted by this deposit
            //      T: total LP tokens allocated before this deposit
    
            depositLPTokens = (depositPercentage * lpToken.totalSupply()) / ((1 * lpPrecision) - depositPercentage);
        }

        return depositLPTokens;
    }



    // Deposit 'amount' into 'pool' and returns the pool LP tokens received
    function allocateToPool(PoolInfo memory pool, uint amount) internal returns (uint) {
        
        IERC20 pooLP = IERC20(pool.lpTokenAddress);
        uint lpBalanceBefore = pooLP.balanceOf(address(this));

        // deposit into the pool
        depositToken.approve(pool.poolAddress, amount);
        IPoolV2(pool.poolAddress).deposit(amount);

        // return the LP tokens received
        return pooLP.balanceOf(address(this)) - lpBalanceBefore;
    }

}