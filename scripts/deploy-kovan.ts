import { ethers } from "hardhat";


// DAI on Kovan
const daiAddress = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa'
const lpDecimals = 18

async function main() {

  // depolyMultiPool("MultiPool1 BTC", [
  //   { name: "pool01", weight: 1 },
  //   { name: "pool03", weight: 1 },
  //   { name: "pool05", weight: 1 },
  // ])
  
  depolyMultiPool("MultiPool2 ETH", [
    { name: "pool02", weight: 1 },
    { name: "pool04", weight: 1 },
    { name: "pool06", weight: 1 },
  ])

  // depolyMultiPool( "MultiPool3 BTC/ETH", [
  //   { name: "pool01", weight: 1 },
  //   { name: "pool02", weight: 1 },
  //   { name: "pool03", weight: 1 },
  //   { name: "pool04", weight: 1 },
  //   { name: "pool05", weight: 1 },
  //   { name: "pool06", weight: 1 },
  // ])

}


async function depolyMultiPool(name: string, pools : Array<Pool>) {

  console.log("Starting deployment of MultiPool: ", name, "on KOVAN")

  const MultiPool = await ethers.getContractFactory("MultiPool");
  const MultiPoolLPToken = await ethers.getContractFactory("MultiPoolLPToken");

  const multiPoolLPToken = await MultiPoolLPToken.deploy("MultiPool LP Token", "MultiPoolLP", lpDecimals)
  await multiPoolLPToken.deployed()
  console.log("LPToken deployed at address:", multiPoolLPToken.address);

  const multiPool = await MultiPool.deploy(daiAddress, multiPoolLPToken.address);
  await multiPool.deployed();
  console.log("MultiPool deployed at address:", multiPool.address);

  // add minter
  await multiPoolLPToken.addMinter(multiPool.address)
  console.log("added multiPool minter");

  // add pools
  for (var pool of pools) {
      const info = kovanPools[pool.name]
      const name = pool.name.replace(/^./, pool.name[0].toUpperCase())
      console.log("adding pool ", name, info.pool, info.pool_lp, pool.weight)

      await multiPool.addPool(name, info.pool, info.pool_lp, pool.weight)
  }

  console.log("Completed MultiPool deployment")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





type Pool = {
  name: keyof typeof kovanPools;
  weight: number;
};

const kovanPools = {
  "pool01": {
      "pool": "0xe7a77915e7f779a5B39C90CfA86007AB17d3a28e",
      "pool_lp": "0xF7234f7875F04520d14114B516FB4042e171B504",
      "strategy": "0x2eA91b98EC963D58ea29416381ED9E1b2422378a",
      "price_feed": "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e"
  },
  "pool02": {
      "pool": "0x22ee99178f6a619c492e1d3c0b3E2A83bbda4849",
      "pool_lp": "0x626110C8351A3285047730A3C4c36f9a5FC6c022",
      "strategy": "0xc60d1925fD3019C2a174Cc8C8d7bCe507c22a4e8",
      "price_feed": "0x9326BFA02ADD2366b30bacB125260Af641031331"
  },
  "pool03": {
      "pool": "0x3303BFD7d919ef7b04ec80728153268CECf962e5",
      "pool_lp": "0x76FE1B363Fa478f70b656673194BE3f2A27c5806",
      "strategy": "0x63fC9a3734859c1952fC740299997c87744E9731",
      "price_feed": "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e"
  },
  "pool04": {
      "pool": "0xfABf63C2CF558573B7BABBe2bd0472F108B9940C",
      "pool_lp": "0xe0ADa09F241A126AF0CA9ecaf763694ED0F2ACED",
      "strategy": "0x35bBEc39CF30ca5294ceE26fEcB047168263083C",
      "price_feed": "0x9326BFA02ADD2366b30bacB125260Af641031331"
  },
  "pool05": {
      "pool": "0xb995c1b6bb43139ae1b2b682db5b4287667fcd7f",
      "pool_lp": "0xA63ef860658eE67c9a194948d1e0bD495fee28c7",
      "strategy": "0x71b8AEB1B8bBc0e6591ffa947c0d08B1a2dCe76C",
      "price_feed": "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e"
  },
  "pool06": {
      "pool": "0xcd52C23b8c8DB708848f5f92eDc574D037831a7e",
      "pool_lp": "0x832eC9f50878a9DB852c906EfC7fd1F6465f6899",
      "strategy": "0x6207Fb3baa1CbEb9e340Bbe68B31072F040Dd8EE",
      "price_feed": "0x9326BFA02ADD2366b30bacB125260Af641031331"
  },
}