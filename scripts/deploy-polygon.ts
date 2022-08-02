import { ethers } from "hardhat";


// USDC on Polygon
const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'


async function main() {

  depolyMultiPool("MultiPool1 BTC", [
    { name: "pool01", weight: 1 },
    { name: "pool03", weight: 1 },
    { name: "pool05", weight: 1 },
  ])
  
  // depolyMultiPool("MultiPool2 ETH", [
  //   { name: "pool02", weight: 1 },
  //   { name: "pool04", weight: 1 },
  //   { name: "pool06", weight: 1 },
  // ])

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

  console.log("Starting deployment of MultiPool: ", name, "on POLYGON")

  const MultiPool = await ethers.getContractFactory("MultiPool");
  const MultiPoolLPToken = await ethers.getContractFactory("MultiPoolLPToken");

  const multiPoolLPToken = await MultiPoolLPToken.deploy("MultiPool LP Token", "MultiPoolLP", 18)
  await multiPoolLPToken.deployed()
  console.log("LPToken deployed at address:", multiPoolLPToken.address);

  const multiPool = await MultiPool.deploy(usdcAddress, multiPoolLPToken.address);
  await multiPool.deployed();
  console.log("MultiPool deployed at address:", multiPool.address);

  // add minter
  await multiPoolLPToken.addMinter(multiPool.address)
  console.log("added multiPool minter");

  // add pools
  for (var pool of pools) {
      const info = polygonPools[pool.name]
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
  name: keyof typeof polygonPools;
  weight: number;
};

const polygonPools = {
  "pool01": {
    "pool": "0x7b8b3fc7563689546217cFa1cfCEC2541077170f",
    "pool_lp": "0x2EbF538B3E0F556621cc33AB5799b8eF089b2D8C",
    "strategy": "0x6aa3D1CB02a20cff58B402852FD5e8666f9AD4bd",
    "price_feed": "0xc907E116054Ad103354f2D350FD2514433D57F6f"
  },
  "pool02": {
      "pool": "0x62464FfFAe0120E662169922730d4e96b7A59700",
      "pool_lp": "0x26b80F5970bC835751e2Aabf4e9Bc5B873713f17",
      "strategy": "0xca5B24b63D929Ddd5856866BdCec17cf13bDB359",
      "price_feed": "0xF9680D99D6C9589e2a93a78A04A279e509205945"
  },
  "pool03": {
      "pool": "0xc60CE76892138d9E0cE722eB552C5d8DE70375a5",
      "pool_lp": "0xe62A17b61e4E309c491F1BD26bA7BfE9e463610e",
      "strategy": "0x46cfDDc7ab8348b44b4a0447F0e5077188c4ff14",
      "price_feed": "0xc907E116054Ad103354f2D350FD2514433D57F6f"
  },
  "pool04": {
      "pool": "0x82314313829B7AF502f9D60a4f215F6b6aFbBE4B",
      "pool_lp": "0xA9085698662029Ef6C21Bbb23a81d3eB55898926",
      "strategy": "0x02CF4916Dd9f4bB329AbE5e043569E586fE006E4",
      "price_feed": "0xF9680D99D6C9589e2a93a78A04A279e509205945"
  },
  "pool05": {
      "pool": "0xa290591BB6606BB0cE71790eC19b83A311e6CcaE",
      "pool_lp": "0x81f219E6CDb60b12CD07b8457A43630050572122",
      "strategy": "0x050851b64fd4E81AB1b78c0bd16B14c92C9327d7",
      "price_feed": "0x34d63c32A8CA29fc4784f7CCaFA8639BcDBD6e35"
  },
  "pool06": {
      "pool": "0x574b983b13A42FbA0788e3AE829553913Fdc5879",
      "pool_lp": "0xB995C1b6bb43139aE1B2B682DB5B4287667Fcd7F",
      "strategy": "0xA63ef860658eE67c9a194948d1e0bD495fee28c7",
      "price_feed": "0x71b8AEB1B8bBc0e6591ffa947c0d08B1a2dCe76C"
  }
}