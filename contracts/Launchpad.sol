// SPDX-License-Identifier: GPL-3.0

/*
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
- 10000000000000000000 fucking decimals
- Map credit to multiple launchpad id

Design UI (Yuan Jie)
*/

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; //we use https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20 to get decimals()

contract LaunchPad {

    //Admin variables
    bool isLocked; //lock contract in case shit happens
    address owner; //owner of this contract
    uint fee = 1; //fee is 1% by default

    //Launchpad variables
    struct LaunchPadInformation {
        uint startTimeStamp;
        uint endTimeStamp;
        uint acceptancePercentage;
        uint milestone;
        uint totalTokens;
        uint pricePerToken;
        address sender;
        address tokenAddress;
    }
    mapping (uint => LaunchPadInformation) public launchpads;
    uint public totalLaunchpads = 0;
    mapping (address => uint) public launchedTokens;
    uint public minNumberofDays = 10;
    uint public minimumTokens = 1000;
    uint public maxNumberofDays = 60; 

    mapping(address => uint) credits; //user bid money, save it here


    //MODIFIERS 

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier isLock() {
        require(!isLocked, "Contract is locked by admin");
        _;
    }

    //CONSTRUCTOR

    constructor (bool _isLocked){
        owner = msg.sender;
        isLocked = _isLocked;
    }

    /// DEVELOPER DEPOSIT

    //TODO: handle allowances = unlimited @lee-min 

    function launchMyToken(uint256 _startTime, uint256 _numOfDays, uint _acceptedPercentage, uint _pricePerToken, uint _totalTokens, address _tokenAddress) public payable isLock {

        // @front-end should handle the conversion from date to Unix timestamp
        // @front-end need to handle price decimal conversion, eg. 1000 = 0.001 ETH

        //verify time logic
        require(_startTime > block.timestamp, "Cannot start in past date");
        require(_numOfDays <= minNumberofDays, "Whoops, can't be that long");
        require(_numOfDays >= minNumberofDays, "too short"); 
        require(_numOfDays <= maxNumberofDays, "Whoops, can't be that long");
        uint _endTimeStamp = block.timestamp + (_numOfDays * 1 days);
        require(_endTimeStamp >= _startTime, "something is really wrong here");

        //verify percentage rate
        require(_acceptedPercentage >= 50, "Must be over 50% acceptance");
        require(_acceptedPercentage <= 100, "Must be less than 100% acceptance");

        //verify existing launchpad for specifc token address
        require(launchedTokens[_tokenAddress] == 0, "This account has an existing launchpad");

        //verify minimum tokens
        require(_totalTokens >= minimumTokens, "Need more tokens to process");

        //verify fees
        uint protocolFee = calculateFee(_totalTokens);
        require(msg.value >= protocolFee, "Not enough fees paid"); 

        //verify _pricePerToken, limit 1 to 10**18, hence we can only accept 18 decimals contract
        require(_pricePerToken >= 1, "max 1 ether per token");
        require(_pricePerToken <= 1 ether, "you exceeded minimum _pricePerToken");

        //calculate required acceptance tokens
        uint milestoneRequired = calculateAcceptanceRate(_totalTokens, _acceptedPercentage);

        // fund contract with developer custom ERC20 token
        //TODO: address check effect integration
        ERC20 customToken = ERC20(_tokenAddress); 
        require(customToken.decimals() == 18, "We only accept 18 decimals tokens");
        require(customToken.allowance(msg.sender, address(this)) >= _totalTokens, "Insuficient allowance"); 
        require(customToken.transferFrom(msg.sender, address(this), _totalTokens), "Transfer failed");

        //increment lauchpad id and update values
        totalLaunchpads += 1;
        launchedTokens[_tokenAddress] = totalLaunchpads;

        //We assume msg.sender is developer, if it's not we are fucked up
        launchpads[totalLaunchpads] = LaunchPadInformation(_startTime, _endTimeStamp, _acceptedPercentage, milestoneRequired, _totalTokens, _pricePerToken, msg.sender, _tokenAddress);

        //emit event
    }

    //TODO: return all to front-end
    function getLaunchPadInformation(uint _launchPadId) public view returns (address) {
        require(totalLaunchpads <= _launchPadId, "that no exist");
        return launchpads[_launchPadId].sender;
    }

    //will remove in production
    function whatTimeNow() public view returns (uint) {
        return block.timestamp;
    }

    /// USER OPERATIONS
    function buyLaunchPadToken(uint _launchpadId) public payable isLock {

        //check launchpad stuff
        require(_launchpadId <= totalLaunchpads, "Invalid launchpadId");
        require(block.timestamp > launchpads[_launchpadId].startTimeStamp, "haven't started yet");
        require(block.timestamp <= launchpads[_launchpadId].endTimeStamp, "it already ended");
        require(launchpads[_launchpadId].totalTokens > 0, "No tokens left");

        //calculation price stuffs
        uint launchpadPricePerToken = launchpads[_launchpadId].pricePerToken;
        uint minimumFunds = 1 ether / launchpadPricePerToken;
        require(msg.value >= minimumFunds, "Sent funds not enough to buy tokens!");
        uint amountToBuy = msg.value * launchpadPricePerToken;
        uint tokensToBuy = amountToBuy / (10 ** 18);

        launchpads[_launchpadId].totalTokens = launchpads[_launchpadId].totalTokens - tokensToBuy;

        //TODO: add credits based on launchPadId
        credits[msg.sender] += tokensToBuy;

        //TODO: should we make price more expensive on last puchase? or we make it average?
    }

    /// AFTER SALES
    function settleLaunchPad() public isLock {
        //check percentage
        //
        //if not enough percentage
        //1. send all funds to developer
        //2. allow user to withdraw ether

        //if enough percentage
        //1. send rest of tokens back to developer
        //2. allow user withdraw erc20 token
        //3. send ether to developer
    }

    //TODO: must be modified
    function withdrawCredits() public isLock {
        //check if launchpad is over acceptancePercentage, if yes allow withdrawal

        uint amount = credits[msg.sender];

        require(amount != 0);
        require(address(this).balance >= amount);

        credits[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    //ADMIN OPERATIONS
    function changeMaxNumOfDays(uint _numOfDays) public onlyOwner {
        require(_numOfDays >= minNumberofDays, "Supplied days is smaller than minimum number of days");
        maxNumberofDays = _numOfDays;
        //emit event
    }

    function changeMinNumOfDays(uint _numOfDays) public onlyOwner {
        require(_numOfDays <= maxNumberofDays, "Supplied days is bigger than maximum number of days");
        minNumberofDays = _numOfDays;
        //emit event
    }

    function changeMinimumTokens(uint _minimumTokens) public onlyOwner {
        require(_minimumTokens > 0, "Cannot set as 0");
        minimumTokens = _minimumTokens;
        //emit event
    }

    function lockContract(bool _isLocked) public onlyOwner {
        isLocked = _isLocked;
    }

    function changeFee(uint _fee) public onlyOwner {
        //check fee rate range from 0%-100%
        require(_fee > 0, "Fee must be larger than 0%");
        require(_fee < 100, "Fee must be lower than 100%");
        fee = _fee;
    }

    function changeOwner(address _newOwner) public onlyOwner {
        //TODO: some checking to verify address
        //TODO: add timelock
        owner = _newOwner;
    }

    //add admin remove launchpads

    //add required functions like totalsupply

    /// Helper functions
    function calculateFee(uint _totalTokens) public view returns (uint) {
        uint totalFee = (_totalTokens * fee) / 100; //multiply before divide
        return totalFee * 10 ** 16; // refer to README for calculation
    }

    function calculateAcceptanceRate(uint _totalTokens, uint _acceptedRate) public pure returns (uint) {
        uint milestone = (_totalTokens * _acceptedRate) / 100; 
        return milestone;
    }

}
