# HashStrat Indexes

This repo constains the Solidity smart contracts for HashStrat Indexes.

HashStrat Indexes allow to invest on a collection (aka basket) of HashSttap Pools and assocaited strategies.
Indexes are configured with a set of HashStrat pools and their relative weights. 

When users deposit funds into an Index, these funds get allocated to the corresponding HashStrat Pools proportionally to the pools' weights within the Index.

After depositing funds into an Index, users recieve Index LP tokens that represent their share of the value in the Idenx.
Users can withdraw their funds by returning their Index LP tokens.

HashStrat Indexes allow to easily invest into a combination of strategies and assets held withing multiple HashStrat Pools and achieve smoother risk and return profiles.



##  Run Tests
```shell
npx hardhat test
npx hardhat run scripts/deploy-polygon.ts
```

##  Deployment 
```shell
npx hardhat run scripts/deploy-polygon.ts
```