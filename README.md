# Blockchain-Assignment

## Contracts

[Launchpad.sol](contracts/Launchpad.sol)

## Installation
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

