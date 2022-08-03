import { expect } from "chai";
import { constants, utils, Contract  } from "ethers"
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { fromUsdc, round } from "./helpers"

import abis from "../test/abis/abis.json";

const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const usdcSource = '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245' // rich account owing 48,354,222.149244  USDC


describe("MultiPool contract", function () {

  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshopt in every test.
  async function deployTokenFixture() {

    // Get the ContractFactory and Signers here.
    const MultiPool = await ethers.getContractFactory("MultiPool");
    const MultiPoolLPToken = await ethers.getContractFactory("MultiPoolLPToken");

    const [owner, addr1, addr2] = await ethers.getSigners();

    const multiPoolLPToken = await MultiPoolLPToken.deploy("MultiPool LP Token", "MultiPoolLP", 6)
    await multiPoolLPToken.deployed()

    const multiPool = await MultiPool.deploy(usdcAddress, multiPoolLPToken.address);
    await multiPool.deployed();

    // add minter
    await multiPoolLPToken.addMinter(multiPool.address)

    const usdc = new Contract(usdcAddress, abis["erc20"], ethers.provider)

    const pool1 = new Contract(pools.pool01.address, abis["poolV2"], ethers.provider)
    const pool2 = new Contract(pools.pool02.address, abis["poolV2"], ethers.provider)
    const pool3 = new Contract(pools.pool03.address, abis["poolV2"], ethers.provider)

    await setupPool(pool1)
    await setupPool(pool2)
    await setupPool(pool3)

    // Fixtures can return anything you consider useful for your tests
    return { MultiPool, multiPool, multiPoolLPToken, owner, addr1, addr2, usdc, pool1, pool2, pool3 };
  }


  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    it("Should set the right deposit token address", async function () {
      const { multiPool, owner } = await loadFixture(deployTokenFixture);

      expect(await multiPool.depositToken()).to.equal(usdcAddress);
    });

  });


  describe("Deposit $1000 into Pool02", function () {

    it("Should allocate LP tokens to the user and the MutliPool", async function () {
      const { multiPool, multiPoolLPToken, owner, usdc } = await loadFixture(deployTokenFixture);

      const lptoken = new Contract(pools.pool02.lptoken, abis["erc20"], ethers.provider)
      const pool2 = new Contract(pools.pool02.address, abis["poolV2"] , ethers.provider)
      await setupPool(pool2)

      // add pool2 (no deposits)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)

      // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.connect(owner).approve(multiPool.address, depositAmount)

      // deposit funds
      await multiPool.deposit(depositAmount);

      const totalPoolsValue = await multiPool.totalPoolsValue();

      expect( fromUsdc(await usdc.balanceOf(owner.address)) ).to.equal(0);

      expect( fromUsdc(await lptoken.balanceOf(multiPool.address)) ).to.equal(1000);

      expect( await multiPoolLPToken.balanceOf(owner.address) ).to.equal(totalPoolsValue);

      expect( await multiPoolLPToken.totalSupply() ).to.equal(totalPoolsValue);

    });

  })


  describe("Deposit into a non empty Pool", function () {

    it("Should allocate the expected LP tokens when the deposit amount is less than the value in the pool", async function () {
      const { multiPool, multiPoolLPToken, addr1, addr2, usdc } = await loadFixture(deployTokenFixture);

      const lptoken = new Contract(pools.pool02.lptoken, abis["erc20"], ethers.provider)
      const pool2 = new Contract(pools.pool02.address, abis["poolV2"] , ethers.provider)

      await setupPool(pool2)

      // add pool2 (no deposits)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)

      // transfer usdcs to owner
      await transferFunds(3_000 * 10 ** 6, addr1.address)
      await transferFunds(1_000 * 10 ** 6, addr2.address)

       // addr1 deposit funds
      const depositAmount1 = 3_000 * 10 ** 6
      await usdc.connect(addr1).connect(addr1).approve(multiPool.address, depositAmount1)
      await multiPool.connect(addr1).deposit(depositAmount1);

      // addr2 deposit funds
      const depositAmount2 = 1_000 * 10 ** 6
      await usdc.connect(addr2).approve(multiPool.address, depositAmount2)
      await multiPool.connect(addr2).deposit(depositAmount2);

      const addr1Balance = await multiPoolLPToken.balanceOf(addr1.address)
      const addr2Balance = await multiPoolLPToken.balanceOf(addr2.address)

      expect( fromUsdc(await usdc.balanceOf(addr2.address)) ).to.equal(0);
      expect( fromUsdc(await lptoken.balanceOf(multiPool.address)) ).to.greaterThan(3990);
      expect( addr1Balance.div(addr2Balance) ).to.equal( 3 );
      expect( addr1Balance ).to.greaterThan(2993);
      expect( addr2Balance ).to.greaterThan(997);
      expect( await multiPoolLPToken.totalSupply() ).to.equal( addr1Balance.add(addr2Balance) );

    });

    it("Should allocate the expected LP tokens when the deposit amount is more than the value in the pool", async function () {
      const { multiPool, multiPoolLPToken, addr1, addr2, usdc } = await loadFixture(deployTokenFixture);

      const lptoken = new Contract(pools.pool02.lptoken, abis["erc20"], ethers.provider)
      const pool2 = new Contract(pools.pool02.address, abis["poolV2"] , ethers.provider)
      await setupPool(pool2)

      // add pool2 (no deposits)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)

      // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, addr1.address)
      await transferFunds(3_000 * 10 ** 6, addr2.address)

       // addr1 deposit funds
      const depositAmount1 = 1_000 * 10 ** 6
      await usdc.connect(addr1).approve(multiPool.address, depositAmount1)
      await multiPool.connect(addr1).deposit(depositAmount1);

      // addr2 deposit funds
      const depositAmount2 = 3_000 * 10 ** 6
      await usdc.connect(addr2).approve(multiPool.address, depositAmount2)
      await multiPool.connect(addr2).deposit(depositAmount2);

      const addr1Balance = await multiPoolLPToken.balanceOf(addr1.address)
      const addr2Balance = await multiPoolLPToken.balanceOf(addr2.address)

      expect( fromUsdc(await usdc.balanceOf(addr2.address)) ).to.equal(0);
      expect( fromUsdc(await lptoken.balanceOf(multiPool.address)) ).to.greaterThan(3990);
      expect( Math.round( addr2Balance.mul(100).div(addr1Balance).toNumber() / 100 ) ).to.equal( 3 );
      expect( addr1Balance ).to.greaterThan( 997 );
      expect( addr2Balance ).to.greaterThan( 2993 );
      expect( await multiPoolLPToken.totalSupply() ).to.equal( addr1Balance.add(addr2Balance) );

    });


  })



  describe("Deposit into a MultiPool of Pool01, Pool02, Pool03", function () {

    it("Should deposit into the pools proportionally to the pool weights", async function () {
      const { multiPool, multiPoolLPToken, owner, usdc, pool1, pool2, pool3 } = await loadFixture(deployTokenFixture);

      const lptoken01 = new Contract(pools.pool01.lptoken, abis["erc20"], ethers.provider)
      const lptoken02 = new Contract(pools.pool02.lptoken, abis["erc20"], ethers.provider)
      const lptoken03 = new Contract(pools.pool03.lptoken, abis["erc20"], ethers.provider)

      // add pools with 20% / 30% / 50% weights
      await multiPool.addPool("Pool01", pools.pool01.address, pools.pool01.lptoken, 20)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 30)
      await multiPool.addPool("Pool03", pools.pool03.address, pools.pool03.lptoken, 50)

      console.log("pool1 totalPortfolioValue: ", fromUsdc(await pool1.totalPortfolioValue()) )
      console.log("pool2 totalPortfolioValue: ", fromUsdc(await pool2.totalPortfolioValue()) )
      console.log("pool3 totalPortfolioValue: ", fromUsdc(await pool3.totalPortfolioValue()) )

      // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.connect(owner).approve(multiPool.address, depositAmount)

      const lp1a = fromUsdc( await lptoken01.totalSupply() )
      const lp2a = fromUsdc( await lptoken02.totalSupply() )
      const lp3a = fromUsdc( await lptoken03.totalSupply() )

      //  deposit funds intp Pool01, Pool02, Pool03 according to the MultiPool weights
      await multiPool.deposit(depositAmount);

      const bal01 = await pool1.totalPortfolioValue()
      const bal02 = await pool2.totalPortfolioValue()
      const bal03 = await pool3.totalPortfolioValue()

      const lp1 = fromUsdc( await lptoken01.totalSupply() )
      const lp2 = fromUsdc( await lptoken02.totalSupply() )
      const lp3 = fromUsdc( await lptoken03.totalSupply() )

      expect( round( bal01 / 10 ** 6 , 0) ).to.equal( 200 )
      expect( round( bal02 / 10 ** 6 , 0) ).to.equal( 300 -1)
      expect( round( bal03 / 10 ** 6 , 0) ).to.equal( 500 )
 
      // verify that the user go the expected MultiPool LP tokens
      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address)) ).to.greaterThan(998);

      // verify that the % of new LP tokens issued by Pool01, Pool02, Pool03  
      // matches the % of the new capital deposited into the pools
      expect( lp1  ).to.equal( 200 );
      expect( lp2  ).to.equal( 300 );
      expect( lp3  ).to.equal( 500 );

    }).timeout(60000);

  })


  describe("Withdraw from Pool02", function () {

    it("Should burn the MultiPool LP tokens for the amount withdrawn", async function () {
      const { multiPool, multiPoolLPToken, owner, usdc } = await loadFixture(deployTokenFixture);

      // get token contracts
      const abi = abis["poolV2"]
      const pool = new Contract(pools.pool02.address, abi, ethers.provider)

      const pool2 = new Contract(pools.pool02.address, abi, ethers.provider)
      await setupPool(pool2)

      // add pool
      multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)

      // transfer usdc to user
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.connect(owner).approve(multiPool.address, depositAmount)

      // deposit funds
      await multiPool.deposit(depositAmount);

      // withdrawy 300 LP tokens
      await multiPool.withdrawLP(300 * 10 ** 6);

      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address)) ).to.greaterThan(697);
      expect( fromUsdc(await multiPoolLPToken.totalSupply()) ).to.greaterThan(697);

      // withdrawy the remaining LP tokens
      await multiPool.withdrawLP(0);
   
      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address)) ).to.equal(0);
      expect( fromUsdc(await multiPoolLPToken.totalSupply())  ).to.equal(0);
      expect( fromUsdc(await pool.totalPortfolioValue()) ).to.equal(0);

    });

  });

});


async function transferFunds(amount: number, recipient: string) {

  // 48,354,222.149244   100.000000
  const [owner, addr1, addr2] = await ethers.getSigners();
  const usdc = new Contract(usdcAddress, abis["erc20"], ethers.provider)

  // impersonate 'account'
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [usdcSource],
  });
  const signer = await ethers.getSigner(usdcSource);
  await usdc.connect(signer).transfer(recipient, amount)
}

async function  setupPool(pool : Contract) {
    const ownerAddress = await pool.owner()
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    const balance = await pool.totalPortfolioValue()
    if (balance > 0) {
      const owner = await ethers.getSigner(ownerAddress);
      await pool.connect(owner).withdrawAll()
    }
}


const pools = {
  pool01: {
    address: '0x7b8b3fc7563689546217cFa1cfCEC2541077170f',
    lptoken: '0x2EbF538B3E0F556621cc33AB5799b8eF089b2D8C',
  },
  pool02: {
    address: '0x62464FfFAe0120E662169922730d4e96b7A59700',
    lptoken: '0x26b80F5970bC835751e2Aabf4e9Bc5B873713f17',
  },
  pool03: {
    address: '0xc60CE76892138d9E0cE722eB552C5d8DE70375a5',
    lptoken: '0xe62A17b61e4E309c491F1BD26bA7BfE9e463610e',
  },
  pool04: {
    address: '0x82314313829B7AF502f9D60a4f215F6b6aFbBE4B',
    lptoken: '0xA9085698662029Ef6C21Bbb23a81d3eB55898926',
  },
  pool05: {
    address: '0x742953942d6A3B005e28a451a0D613337D7767b2',
    lptoken: '0x7EB471C4033dd8c25881e9c02ddCE0C382AE8Adb',
  },
  pool06: {
    address: '0x949e118A42D15Aa09d9875AcD22B87BB0E92EB40',
    lptoken: '0x74243293f6642294d3cc94a9C633Ae943d557Cd3',
  }
}
