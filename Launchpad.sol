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

contract LaunchPad {

    //Admin variables
    bool isLocked; //lock contract in case shit happens
    address owner; //owner of this contract
    uint fee = 5; //fee is 5% by default

    //Launchpad variables
    struct LaunchPadInformation {
        uint startTimeStamp;
        uint endTimeStamp;
        uint acceptancePercentage;
        uint totalTokens;
        address sender;
    }
    mapping (uint => LaunchPadInformation) public launchpads;
    uint public totalLaunchpads = 0;
    uint minNumberofDays = 10;
    uint minimumTokens = 1000;
    uint maxNumberofDays = 60; 
    

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

    //DEVELOPER DEPOSIT
    //TODO: should we use Unix timestamp? Or number of days?
    function launchMyToken(uint256 _startTime, uint256 _numOfDays, uint _acceptedPercentage, uint _totalTokens) public payable isLock {

        //would be cleaner if put into internal function
        require(_startTime > block.timestamp, "Cannot start in past date"); //front-end should handle the conversion from date to Unix timestamp
        require(_numOfDays <= minNumberofDays, "Whoops, can't be that long");
        require(_numOfDays >= minNumberofDays, "too short"); 
        require(_numOfDays <= maxNumberofDays, "Whoops, can't be that long");
        require(_acceptedPercentage >= 50, "Must be over 50% acceptance");
        require(_acceptedPercentage <= 100, "Must be less than 100% acceptance");

        //TODO: check for duplicate msg.sender, how?
        //require(launchpads[msg.sender].endTimeStamp == 0, "This account has an existing bid");

        //msg.value represents eth, we cannot do this, needs to change in future
        //TODO: handle unlimited approval, transfer funds to this contract
        //https://ethereum.stackexchange.com/questions/110972/how-to-transfer-erc20-tokens-to-a-contract-on-a-function-call
        require(_totalTokens >= minimumTokens, "Need more tokens to process");

        uint _endTimeStamp = block.timestamp + (_numOfDays * 1 days);
        require(_endTimeStamp >= _startTime, "something is really wrong here");

               
        //if someone have a better idea lmk
        //https://programtheblockchain.com/posts/2018/01/12/writing-a-contract-that-handles-time/
        //see if you want handle time in Unix timestamp, or use days like start after 2 days then end in 30 days

        //TODO: calculate fee based on fee = msg.value
        //TODO: formula? 

        //increment lauchpad id
        totalLaunchpads += 1;

        //We assume msg.sender is developer, if it's not we are fucked up
        launchpads[totalLaunchpads] = LaunchPadInformation(_startTime, _endTimeStamp, _acceptedPercentage, _totalTokens, msg.sender);
 
    }

    function getLaunchPadInformation(uint _launchPadId) public view returns (address) {
        require(totalLaunchpads <= _launchPadId, "that no exist");
        return launchpads[_launchPadId].sender;
    }

    //will remove in production
    function whatTimeNow() public view returns (uint) {
        return block.timestamp;
    }

    //USER OPERATIONS
    function buyLaunchPadToken(uint _launchpadId) public payable isLock {
        //check launchpadId stuff
        require(_launchpadId <= totalLaunchpads, "Invalid launchpadId");
        require(block.timestamp > launchpads[_launchpadId].startTimeStamp, "haven't started yet");
        require(block.timestamp <= launchpads[_launchpadId].endTimeStamp, "it already ended");

        //check msg.value to determine bid amount
        require(msg.value > 0 ether, "send money pls");

        //only allow maximum 100 eth per user
        if ((credits[msg.sender] += msg.value) <= 100){
            credits[msg.sender] += msg.value;
        } else {
            revert("You exceeded the maximum bid which is 100 ETH");
        }
    }

    //AFTER SALES
    function settleLaunchPad() public isLock {
        //check percentage
        //
        //if not enough percentage
        //1. send all funds to developer
        //2. allow user to withdraw ether

        //if enough percentage
        //1. send rest of tokens back to developer
        //2. user withdraw erc20 token
        //3. send ether to developer
    }

    //TODO: must be modified
    function withdrawCredits() public isLock {
        //check if launchpad is over end date

        uint amount = credits[msg.sender];

        require(amount != 0);
        require(address(this).balance >= amount);

        credits[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    //ADMIN OPERATIONS
    function changeMaxNumOfDays(uint _numOfDays) public onlyOwner {
        maxNumberofDays = _numOfDays;
        //emit event
    }

    function changeMinNumOfDays(uint _numOfDays) public onlyOwner {
        minNumberofDays = _numOfDays;
        //emit event
    }

    function changeMinimumTokens(uint _minimumTokens) public onlyOwner {
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

}
