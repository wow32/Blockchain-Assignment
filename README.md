# Blockchain-Assignment

## Contracts

[LaunchPad.sol](contracts/LaunchPad.sol)

## Testing in Remix IDE
1. Deploy Launchpad
1. Deploy custom ERC20 token
2. Approve or increase allowance for launchpad to spend, [front-end need to handle this](https://ethereum.stackexchange.com/a/112191)
3. Run `launchMyToken` function with desired input, optionally run `estimateProtocolFee` to estimate required fee.
4. User purchase via `buyLaunchPadToken`, optionally run `retrievePriceForToken` or `getMaxBuyValueForToken` beforehand to estimate price.
5. Run `settleLaunchPad` to finish the launchpad
6. User run `withdrawCredits` to withdraw funds, either ETH or custom tokens

## Protocol Fees
The protocol will take a small percentage of fees from the developers in order to operate the system and eat bread.
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
The above example shows that the developer is required to deposit 0.1 ETH as protocol fees when attempting to launch 1000 tokens to the launchpad set at 1%.


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

#### Start local development node
```
ganache-cli
```

#### Run test files
```
truffle test
```

## Work Flow
1. Developer deposit tokens 
- Handle max capacity
- Handle time to start and end
- Percentage of acceptance (eg. 60%)

2. User participate in crowdsale
- Record user purchase in credits
- Check if sale already started and ended already
- Only accept ETH

3. After sales
- check percentage, if not satisfy send tokens back to developer 
- pull over push method to let user withdraw
- refund left crypto to developer (if have)

4. Admin functions
- withdraw all funds
- lock contract 
- update admin (timelock?)

5. Front end design
- web3 js integration

## Future improvements
1. Allowing developer to launch token address more than one time
2. Use other funds instead of ETH
3. Dynamic calculation system
4. Gas optimization
5. Vesting 
6. Protocol token for platform launch
7. Testnet launch and testing

## TODO:
- [x] Fee calculations
- [ ] Events should be emitted
- [ ] Public getters
- [x] Price per token
- [ ] Test cases to make sure everything works as expected
- [x] Limit to 18 decimals
- [x] Map credit to multiple launchpad id
- [ ] Write [NatSpec](https://docs.soliditylang.org/en/v0.8.10/natspec-format.html) comments
- [ ] Refactor code for readability
- [x] Getters for minimum and maximum price per token
- [ ] Finalize README

## References
1. https://eth-converter.com/
2. https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20
