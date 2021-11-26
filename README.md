# Blockchain-Assignment

## Contracts

[Launchpad.sol](contracts/Launchpad.sol)

## Compile

```
truffle compile
```

## TODO
1. Developer deposit tokens (Lee Min) 
- Handle max capacity
- Handle time to start and end
- tokens leave in contract
- Percentage of acceptance (eg. 60%)

2. User participate in crowdsale
-  Record user purchase in credits
- Check if sale already started and ended already
- Only accept ETH
- User purchase per limit

3. After sales
- check percentage, if not satisfy send tokens back to developer 
- pull over push method to let user withdraw
- refund left crypto to developer (if have)

4. Admin
- withdraw all funds
- lock contract 
- update admin (timelock?)

Todo: 
- Fee calculations
- Events should be emitted
- Public getters
- Price per token
- Test cases to make sure everything works as expected
- 10000000000000000000 decimals are 18 default need to handle
- Map credit to multiple launchpad id

Design UI (Yuan Jie)