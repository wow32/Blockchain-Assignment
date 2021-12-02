// SPDX-License-Identifier: MIT
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
        uint originalAmountofTokens; //original deposit 1000?
        uint totalTokens; //1000 - 100 = 900
        uint pricePerToken;
        address sender;
        address tokenAddress;
        bool paid;
        uint creditType; //0: Unset, 1: ETH, 2: Token
    }
    mapping(uint => LaunchPadInformation) public launchpads;
    uint public totalLaunchpads = 0;
    mapping(address => uint) public launchedTokens;
    uint public minNumberofDays = 10;
    uint public minimumTokens = 1000;
    uint public maxNumberofDays = 60;

    struct CreditPerLaunchPad {
        uint credits;
        address tokenAddress;
    }

    mapping(address => CreditPerLaunchPad) userCredits; //user bid money, save it here


    //MODIFIERS 

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier isLock() {
        require(!isLocked, "Contract is locked by admin");
        _;
    }

    modifier checkWithdrawType(uint _launchpadId) {
        require(launchpads[_launchpadId].creditType != 0, "refund type not set yet!");
        _;
    }

    //event

    event DepositToken();

    //CONSTRUCTOR

    constructor(bool _isLocked) {
        owner = msg.sender;
        isLocked = _isLocked;
    }

    /// DEVELOPER DEPOSIT

    function launchMyToken(uint256 _startTime, uint256 _numOfDays, uint _acceptedPercentage, uint _pricePerToken, uint _totalTokens, address _tokenAddress) public payable isLock {

        // @front-end should handle the conversion from date to Unix timestamp
        // @front-end need to handle price decimal conversion, eg. 1000 = 0.001 ETH
        // @front-end need to handle approval https://ethereum.stackexchange.com/a/112191

        //verify time logic
        if (_startTime < block.timestamp){
            //default start now unless specified otherwise
            _startTime = block.timestamp;
        }
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

        //increment lauchpad id and update values
        totalLaunchpads += 1;
        launchedTokens[_tokenAddress] = totalLaunchpads;

        launchpads[totalLaunchpads] = LaunchPadInformation(_startTime, _endTimeStamp, _acceptedPercentage, milestoneRequired, _totalTokens, _totalTokens, _pricePerToken, msg.sender, _tokenAddress, false, 0);

        // fund contract with developer custom ERC20 token
        ERC20 customToken = ERC20(_tokenAddress);
        require(customToken.decimals() == 18, "We only accept 18 decimals tokens");
        uint balanceOfUser = customToken.balanceOf(msg.sender);
        require(balanceOfUser >= _totalTokens, "Not enough funds in sender balance!");
        require(customToken.allowance(msg.sender, address(this)) >= _totalTokens, "Insuficient allowance");
        require(customToken.transferFrom(msg.sender, address(this), _totalTokens), "Transfer failed");

        //emit event
        emit DepositToken();
    }

    //will remove in production
    function whatTimeNow() public view returns(uint) {
        return block.timestamp;
    }

    /// USER OPERATIONS
    function buyLaunchPadToken(uint _launchpadId) public payable isLock {
        require(msg.sender != launchpads[_launchpadId].sender, "developers cannot buy their own token");

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

        //instead of revert, we can buy highest available and return funds to user
        require(launchpads[_launchpadId].totalTokens >= tokensToBuy, "Not enough tokens to buy!");

        launchpads[_launchpadId].totalTokens = launchpads[_launchpadId].totalTokens - tokensToBuy;

        //increment credit
        uint oldCredit = userCredits[msg.sender].credits;
        uint newCredit = oldCredit + tokensToBuy;
        userCredits[msg.sender] = CreditPerLaunchPad(newCredit, launchpads[_launchpadId].tokenAddress);
    }

    /// AFTER SALES
    function settleLaunchPad(uint _launchpadId) public {

        //developers and user run this to take funds
        require(_launchpadId <= totalLaunchpads, "Invalid launchpadId");
        require(launchpads[_launchpadId].paid == false, "This launchpad has been settled");

        //calculate acceptance percentage
        bool mileStoneAchieved;
        uint tokensBought = launchpads[_launchpadId].originalAmountofTokens - launchpads[_launchpadId].totalTokens;
        if (tokensBought >= launchpads[_launchpadId].milestone) {
            mileStoneAchieved = true;
        } else {
            mileStoneAchieved = false;
        }

        //check launchpad end
        bool isLaunchPadEnd;
        if (block.timestamp >= launchpads[_launchpadId].endTimeStamp) {
            isLaunchPadEnd = true;
        } else {
            isLaunchPadEnd = false;
        }

        //pre launchpad ending time
        if (!isLaunchPadEnd) {
            //code would enter this block if launchpad is too popular, ie. tokens are all bought before ending time
            //user can call this function to start withdraw tokens before ending time, under condition that milestone is achieved

            if (mileStoneAchieved) {
                //if the tokens are so popular that everyone bought it before ending time, we will close it
                if (launchpads[_launchpadId].totalTokens == 0) {
                    successLaunchPad(_launchpadId);

                } else {
                    //there are still tokens left, so we allow user withdraw first because milestone is achieved
                    launchpads[_launchpadId].creditType = 2;
                }

            } else {
                //if milestone is not achieved yet
                revert("Milestone not achieved yet!");
            }

        } else if (isLaunchPadEnd) {
            //post launchpad ending time
            //only two possibilites, accepted or not

            if (mileStoneAchieved) {
                //if milestone achieved
                successLaunchPad(_launchpadId);

            } else if (!mileStoneAchieved) {
                //if no one buy their token :(
                failLaunchPad(_launchpadId);
            }
        }

    }

    function successLaunchPad(uint _launchpadId) internal {
        //set funds paid to true
        launchpads[_launchpadId].paid = true;

        //allow user withdraw token
        launchpads[_launchpadId].creditType = 2;

        //calculate ETH amount to be sent
        uint tokenInEth = 1 ether / launchpads[_launchpadId].pricePerToken;
        uint amount = launchpads[_launchpadId].originalAmountofTokens * tokenInEth;

        //send ETH to dev
        (bool sent, ) = launchpads[_launchpadId].sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    function failLaunchPad(uint _launchpadId) internal {
        //set funds paid to true
        launchpads[_launchpadId].paid = true;

        //allow user withdraw eth
        launchpads[_launchpadId].creditType = 1;

        //calculate token to be sent
        ERC20 customToken = ERC20(launchpads[_launchpadId].tokenAddress);
        uint amount = launchpads[_launchpadId].originalAmountofTokens;

        //send token to dev
        customToken.transferFrom(address(this), launchpads[_launchpadId].sender, amount);
    }

    function withdrawCredits(uint _launchPadId) public checkWithdrawType(_launchPadId) {
        //NOTE: all verifications are done in settleLaunchPad, hence a modifier to prevent bad stuff happen
        // get launchpads address from struct
        uint amount = userCredits[msg.sender].credits;

        require(_launchPadId <= totalLaunchpads, "Invalid launchpadId");
        require(amount != 0, "nothing to withdraw");
        require(address(this).balance >= amount, "not enough balance to withdraw");

        userCredits[msg.sender].credits = 0;

        if (launchpads[_launchPadId].creditType == 1){
            //user withdraw ETH
            (bool sent, ) = msg.sender.call {value: amount}("");
            require(sent, "Failed to send Ether");
        } else if ((launchpads[_launchPadId].creditType == 2)){
            //user withdraw token
            ERC20 customToken = ERC20(launchpads[_launchPadId].tokenAddress);
            require(customToken.transfer(msg.sender, amount), "unable to send money");
        }   
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
        require(_newOwner != address(0), "cannot set to null address");
        //TODO: add timelock
        owner = _newOwner;
    }

    //add admin remove launchpads todo

    function retrievePriceForToken(uint _launchPadId) public view returns (uint) {
        // return ETH price for one token 
        // get price per token for supplied _launchPadId
        return 1 ether / launchpads[_launchPadId].pricePerToken;
    }

    // get max buy value for available tokens
    function getMaxBuyValueForToken(uint _launchPadId) public view returns (uint) {
        uint tokensLeft = launchpads[_launchPadId].totalTokens;
        require(tokensLeft != 0, "No tokens left to buy!");
        uint pricePerToken = 1 ether / launchpads[_launchPadId].pricePerToken;
        return tokensLeft * pricePerToken;
    }

    /// Helper functions
    function calculateFee(uint _totalTokens) public view returns(uint) {
        uint totalFee = (_totalTokens * fee) / 100; //multiply before divide
        return totalFee * 10 ** 16; // refer to README for calculation
    }

    function calculateAcceptanceRate(uint _totalTokens, uint _acceptedRate) public pure returns(uint) {
        uint milestone = (_totalTokens * _acceptedRate) / 100;
        return milestone;
    }

     function estimateProtocolFee(uint _totalTokens) public view returns (uint) {
        // Formula: totalTokens * protocolFeePercentage * ethUnit
        uint _protocolFeePercentage = fee; // 1%
        uint _ethUnit = 10 ** 16; // 0.001 ETH
        uint feePercentage = (_totalTokens * _protocolFeePercentage) / 100; 
        uint feeToPaid = feePercentage * _ethUnit;
        return feeToPaid;
    }

}
