import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";

require('dotenv').config()


const { RPC_URL_POLYGON_MAIN, RPC_URL_ALCHEMY_POLYGON_MAIN, RPC_URL_GOERLI, ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY, MNEMONIC} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.15",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: RPC_URL_POLYGON_MAIN || "",
        blockNumber: 34661181 //31481928
      }
    },
    goerli: {
      url: RPC_URL_GOERLI,
      accounts: { mnemonic: MNEMONIC  },
    },
    polygon: {
      url: RPC_URL_POLYGON_MAIN,
      accounts: { mnemonic: MNEMONIC  },
      gasPrice:  120000000000,  // 120 Gwei
    },
  },
  etherscan: {
    apiKey: {
        mainnet: ETHERSCAN_API_KEY || "",
        kovan: ETHERSCAN_API_KEY || "",
        polygon: POLYGONSCAN_API_KEY || "",
    }
  },
};

export default config;
