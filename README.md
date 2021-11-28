# Blockchain-Assignment

## Contracts

[Launchpad.sol](contracts/Launchpad.sol)

## Calculation Fees
``` solidity
feeToPaid = totalTokens * protocolFeePercentage * ethUnit
```
- `totalTokens`: Total amount of tokens developer wants to launch, eg. `1000`
- `protocolFeePercentage`: Service fee taken by protocol, eg. `1%`
- `ethUnit`: ETH is denominated by Wei and doesn't support decimals, we will be using `0.001 ETH`, eg. `10 ** 16`

Example:
```solidity
 function calculate() public pure returns (uint) {
        // Formula: totalTokens * protocolFeePercentage * ethUnit
        uint _totalTokens = 1000; // 1000 tokens to launch
        uint _protocolFeePercentage = 1; // 1%
        uint _ethUnit = 10 ** 16; // 0.001 ETH

        uint feePercentage = (_totalTokens * _protocolFeePercentage) / 100; //multiply before division
        uint feeToPaid = feePercentage * _ethUnit;
        return feeToPaid; //returns 100000000000000000 Wei = 0.1 ETH, source: https://eth-converter.com/
    }
```


## Installation
> To develop use Remix IDE directly

#### Clone the GitHub repository

```
git clone https://github.com/wow32/Blockchain-Assignment
```

#### Compile the contracts
```
truffle compile
```

## Organization
1. Developer deposit tokens (Lee Min) 
- Handle max capacity
- Handle time to start and end
- tokens leave in contract
- Percentage of acceptance (eg. 60%)

2. User participate in crowdsale
- Record user purchase in credits
- Check if sale already started and ended already
- Only accept ETH
- User purchase per limit

3. After sales
- check percentage, if not satisfy send tokens back to developer 
- pull over push method to let user withdraw
- refund left crypto to developer (if have)

4. Admin functions
- withdraw all funds
- lock contract 
- update admin (timelock?)

5. Design UI (Yuan Jie)

## TODO:
- [ ] Fee calculations
- [ ] Events should be emitted
- [ ] Public getters
- [ ] Price per token
- [ ] Test cases to make sure everything works as expected
- [ ] Limit to 18 decimals
- [ ] Map credit to multiple launchpad id

