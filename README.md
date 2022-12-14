# HashStrat Indexes

This repo constains the Solidity smart contracts for HashStrat Indexes.

HashStrat Indexes allow to invest on a collection (aka basket) of HashSttap Pools and their assocaited strategies.
Each Index is configured with a set of HashStrat pools and their relative weights. 

When users deposit funds into an Index, these funds get allocated to the corresponding HashStrat Pools proportionally to the pools' weights within the Index.

After depositing funds into an Index, users recieve Index LP tokens that represent their share of the value in the Idenx.
Users can withdraw their funds by returning their Index LP tokens.

HashStrat Indexes allow to easily invest into a combination of strategies and assets held withing multiple HashStrat Pools and achieve smoother risk and return profiles.

## Install Dependencies

```shell
brew install node                # Install Node (MacOS with Homebrew)
npm install --save-dev hardhat   # Install HardHat
npm install                      # Install dependencies

```

##  Run Tests
```shell
npx hardhat test
```

##  Deployment 
```shell
npx hardhat run --network polygon scripts/deploy-polygon.ts
```
