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

    const usdc = await ethers.getContractAt('Token', usdcAddress);

    // get token contracts
    const abi = abis["poolV2"]
    const pool1 = new Contract(pools.pool01.address, abi, ethers.provider)
    const pool2 = new Contract(pools.pool02.address, abi, ethers.provider)
    const pool3 = new Contract(pools.pool03.address, abi, ethers.provider)

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

      // get token contracts
      const abi = abis["poolV2"]  
      const lptoken = await ethers.getContractAt('Token', pools.pool02.lptoken);

      const pool2 = new Contract(pools.pool02.address, abi, ethers.provider)
      await setupPool(pool2)

      // add pool2 (no deposits)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)

      // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.approve(multiPool.address, depositAmount)

      // deposit funds
      await multiPool.deposit(depositAmount);

      expect( fromUsdc(await usdc.balanceOf(owner.address)) ).to.equal("0.0");

      expect( fromUsdc(await lptoken.balanceOf(multiPool.address)) ).to.equal("1000.0");

      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address)) ).to.equal("1000.0");

      expect( fromUsdc(await multiPoolLPToken.totalSupply()) ).to.equal("1000.0");

    });

  })


  describe("Deposit $1000 into Pool01, Pool02, Pool03", function () {

    it("Should deposit into the pools proportionally to the pool weights", async function () {
      const { multiPool, multiPoolLPToken, owner, usdc, pool1, pool2, pool3 } = await loadFixture(deployTokenFixture);


      const lptoken01 = await ethers.getContractAt('Token', pools.pool01.lptoken);
      const lptoken02 = await ethers.getContractAt('Token', pools.pool02.lptoken);
      const lptoken03 = await ethers.getContractAt('Token', pools.pool03.lptoken);

      // add pools with 20% / 30% / 50% weights
      await multiPool.addPool("Pool01", pools.pool01.address, pools.pool01.lptoken, 20)
      await multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 30)
      await multiPool.addPool("Pool03", pools.pool03.address, pools.pool03.lptoken, 50)

      console.log("pool1 totalPortfolioValue: ", fromUsdc(await pool1.totalPortfolioValue()) )
      console.log("pool2 totalPortfolioValue: ", fromUsdc(await pool2.totalPortfolioValue()) )
      console.log("pool3 totalPortfolioValue: ", fromUsdc(await pool3.totalPortfolioValue()) )

      // // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.approve(multiPool.address, depositAmount)

      const lp1a = Number( fromUsdc( await lptoken01.totalSupply() ))
      const lp2a = Number( fromUsdc( await lptoken02.totalSupply() ))
      const lp3a = Number( fromUsdc( await lptoken03.totalSupply() ))

      //  deposit funds intp Pool01, Pool02, Pool03 according to the MultiPool weights
      await multiPool.deposit(depositAmount);

      const bal01 = await pool1.totalPortfolioValue()
      const bal02 = await pool2.totalPortfolioValue()
      const bal03 = await pool3.totalPortfolioValue()

      const lp1 = Number( fromUsdc( await lptoken01.totalSupply() ))
      const lp2 = Number( fromUsdc( await lptoken02.totalSupply() ))
      const lp3 = Number( fromUsdc( await lptoken03.totalSupply() ))

      expect( round( bal01 / 10 ** 6 , 0) ).to.equal( 200 )
      expect( round( bal02 / 10 ** 6 , 0) ).to.equal( 300 -1)
      expect( round( bal03 / 10 ** 6 , 0) ).to.equal( 500 )
 
      // verify that the user go the expected MultiPool LP tokens
      expect(  fromUsdc(await multiPoolLPToken.balanceOf(owner.address))  ).to.equal("1000.0");

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
      const lptoken = await ethers.getContractAt('Token', pools.pool02.lptoken);

      const pool2 = new Contract(pools.pool02.address, abi, ethers.provider)
      await setupPool(pool2)

      // add pool
      multiPool.addPool("Pool02", pools.pool02.address, pools.pool02.lptoken, 100)


      // transfer usdcs to owner
      await transferFunds(1_000 * 10 ** 6, owner.address)

      const depositAmount = 1_000 * 10 ** 6
      await usdc.approve(multiPool.address, depositAmount)

      // deposit funds
      await multiPool.deposit(depositAmount);

      // withdrawy 300 LP tokens
      await multiPool.withdrawLP(300 * 10 ** 6);

      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address))  ).to.equal("700.0");
      expect( fromUsdc(await multiPoolLPToken.totalSupply())  ).to.equal("700.0");


      // withdrawy the remaining 700 LP tokens
      await multiPool.withdrawLP(700 * 10 ** 6);
   
      expect( fromUsdc(await multiPoolLPToken.balanceOf(owner.address))  ).to.equal("0.0");
      expect( fromUsdc(await multiPoolLPToken.totalSupply())  ).to.equal("0.0");
      expect( fromUsdc(await pool.totalPortfolioValue()) ).to.equal( "0.0");

    });

  });

});


async function transferFunds(amount: number, recipient: string) {

  // 48,354,222.149244   100.000000
  const [owner, addr1, addr2] = await ethers.getSigners();
  const usdc = await ethers.getContractAt('Token', usdcAddress);

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
    console.log("ownerAddress: ", ownerAddress)

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    const balance = await pool.totalPortfolioValue()
    console.log("withdrawing ", balance.toString())
    if (balance > 0) {
      const owner = await ethers.getSigner(ownerAddress);
      await pool.connect(owner).withdrawAll()
    }
}


const pools = {
  pool01: {
    address: '0x5F7621d43fa646C3e7838266DD12ccCb390Dc933',
    lptoken: '0xAE013eD73fc72f4361aECed322612A973fd36085',
  },
  pool02: {
    address: '0xeA2addD56cef3757ed9e473e5Bb39E5aF00531F0',
    lptoken: '0x23De455b52537c442c00F8eC5c11fC64d4e9811E',
  },
  pool03: {
    address: '0xc60CE76892138d9E0cE722eB552C5d8DE70375a5',
    lptoken: '0xe62A17b61e4E309c491F1BD26bA7BfE9e463610e',
  },
  pool04: {
    address: '0x82314313829B7AF502f9D60a4f215F6b6aFbBE4B',
    lptoken: '0x81f219E6CDb60b12CD07b8457A43630050572122',
  },
  pool05: {
    address: '0xa290591BB6606BB0cE71790eC19b83A311e6CcaE',
    lptoken: '0x81f219E6CDb60b12CD07b8457A43630050572122',
  },
  pool06: {
    address: '0x574b983b13A42FbA0788e3AE829553913Fdc5879',
    lptoken: '0xB995C1b6bb43139aE1B2B682DB5B4287667Fcd7F',
  }

}