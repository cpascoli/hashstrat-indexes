import { expect } from "chai";
import { constants, utils, Contract  } from "ethers"
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { fromUsdc, toUsdc, round } from "./helpers"

import abis from "./abis/abis.json";

const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const usdcSource = '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245' // rich account owing 48,354,222.149244  USDC


describe("MultiPool contract", function () {

  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshopt in every test.
  async function getContracts() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const usdc = new Contract(usdcAddress, abis["erc20"], ethers.provider)

    const pool1 = new Contract(pools.pool01.address, abis["poolV2"], ethers.provider)
    const pool2 = new Contract(pools.pool02.address, abis["poolV2"], ethers.provider)
    const pool3 = new Contract(pools.pool03.address, abis["poolV2"], ethers.provider)
    const pool4 = new Contract(pools.pool04.address, abis["poolV2"], ethers.provider)
    const pool5 = new Contract(pools.pool05.address, abis["poolV2"], ethers.provider)
    const pool6 = new Contract(pools.pool06.address, abis["poolV2"], ethers.provider)

    setupPool(pool1)
    setupPool(pool2)
    setupPool(pool3)
    setupPool(pool4)
    setupPool(pool5)
    setupPool(pool5)

    const multipool1 = new Contract(multipools.multiPool01.pool, abis["multipool"], ethers.provider)
    const multipool2 = new Contract(multipools.multiPool02.pool, abis["multipool"], ethers.provider)
    const multipool3 = new Contract(multipools.multiPool03.pool, abis["multipool"], ethers.provider)

    const multipoolLp1 = new Contract(multipools.multiPool01.pool_lp, abis["erc20"], ethers.provider)
    const multipoolLp2 = new Contract(multipools.multiPool02.pool_lp, abis["erc20"], ethers.provider)
    const multipoolLp3 = new Contract(multipools.multiPool03.pool_lp, abis["erc20"], ethers.provider)

    // Fixtures can return anything you consider useful for your tests
    return { owner, addr1, addr2, usdc, multipool1, multipool2, multipool3, multipoolLp1, multipoolLp2, multipoolLp3, pool1, pool2, pool3, pool4, pool5, pool6};
  }


  // You can nest describe calls to create subsections.
  describe("MultiPoolClient", function () {

    
    it("Should have the right deposit token address", async function () {
      const { multipool1, multipool2, multipool3 } = await loadFixture(getContracts);

      expect(await multipool1.depositToken()).to.equal(usdcAddress);
      expect(await multipool2.depositToken()).to.equal(usdcAddress);
      expect(await multipool3.depositToken()).to.equal(usdcAddress);

    });


    it("Should allow a user to deposit into the MutliPool", async function () {
      const { multipool3, multipoolLp3, owner, usdc, pool1, pool2, pool3, pool4, pool5, pool6 } = await loadFixture(getContracts);

      await transferFunds(1_000 * 10 ** 6, owner.address)
      
      // deposit funds
      const deposit = 1_000 * 10 ** 6

      await usdc.connect(owner).approve(multipool3.address, deposit)
      await multipool3.connect(owner).deposit(deposit);

      expect( Math.round(fromUsdc(await multipoolLp3.balanceOf(owner.address))) ).to.equal(999);

      expect( Math.floor( fromUsdc(await pool1.totalPortfolioValue())) ).to.equal(166);
      expect( Math.floor( fromUsdc(await pool2.totalPortfolioValue())) ).to.equal(166);
      expect( Math.floor( fromUsdc(await pool3.totalPortfolioValue())) ).to.equal(166);
      expect( Math.floor( fromUsdc(await pool4.totalPortfolioValue())) ).to.equal(166);
      expect( Math.floor( fromUsdc(await pool5.totalPortfolioValue())) ).to.equal(166);
      expect( Math.floor( fromUsdc(await pool6.totalPortfolioValue())) ).to.equal(166);

    }).timeout(300000);



    it("Should allow a user to withdraw from the MutliPool", async function () {
      const { multipool3, multipoolLp3, addr1, addr2, usdc, pool1, pool2, pool3, pool4, pool5, pool6 } = await loadFixture(getContracts);
   
      await transferFunds(1_000 * 10 ** 6, addr1.address)
      await transferFunds(2_000 * 10 ** 6, addr2.address)

      // addr1 deposit funds
      const deposit = 1_000 * 10 ** 6
      await usdc.connect(addr1).approve(multipool3.address, deposit)
      await multipool3.connect(addr1).deposit(deposit);

      expect( fromUsdc(await usdc.balanceOf(addr1.address)) ).to.equal( 0 );
      expect( Math.round(fromUsdc( await multipoolLp3.balanceOf(addr1.address))) ).to.equal( 999 );
      expect( Math.round(fromUsdc( await multipool3.totalPoolsValue())) ).to.equal( 999 );

      
      // addr2 deposit funds
      const deposit2 = 2_000 * 10 ** 6
      await usdc.connect(addr2).approve(multipool3.address, deposit2)
      await multipool3.connect(addr2).deposit(deposit2);

      expect( Math.round(fromUsdc(await multipoolLp3.balanceOf(addr2.address))) ).to.equal( 2 * 999 );

      // addr1 withdraws all LP
      await multipool3.connect(addr1).withdrawLP(0);

      // console.log("MultiPoolLP totalSupply: ", fromUsdc(await multipoolLp3.totalSupply()) )
      // console.log("totalPoolsValue: ", fromUsdc( await multipool3.totalPoolsValue()) )

      expect( await multipoolLp3.balanceOf(addr1.address) ).to.equal( 0 );

      expect( Math.round(fromUsdc( await multipool3.totalPoolsValue())) ).to.equal( 1998 );

      expect( Math.round(fromUsdc( await multipool3.totalPoolsValue())) ).to.equal( 1998 );

      expect( Math.round(fromUsdc(await usdc.balanceOf(addr1.address))) ).to.equal( 997 );


    }).timeout(300000);

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




const multipools = {
    multiPool01: {
      pool: "0x9Abb51AC3A84787A2Fe2a829B890cb00ea8bCdfb",
      pool_lp: "0x99644c65345AB9C8CA198593F27BB83053774D1e"
    },
    multiPool02: {
        pool: "0x36de93a7d635F957A5E8533058786e3c96B3C9e1",
        pool_lp: "0x46c1DaE18e8DF4758eB535a8Be97Ca7a94563D39"
    },
    multiPool03: {
        pool: "0xd7689E9f3F38673cF56fa5C60b3764b69cfd20Bc",
        pool_lp: "0x7046310BaB92d4547f9fb23700346aa1dC1d679E"
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