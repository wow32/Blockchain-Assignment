const LaunchPad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");
const EmoToken = artifacts.require("EmoToken");
const { expectRevert, time } = require('@openzeppelin/test-helpers');
// const { assert } = require('console');

/*
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0-beta.0/test/token/ERC20/utils/TokenTimelock.test.js
 */

contract("LaunchPad", (accounts) => {

    before(async() => {
        launchpad_contract = await LaunchPad.deployed();
        token_contract = await MyToken.deployed();
        launchpad_owner = accounts[0];
        token_owner = accounts[1];
        token_owner_original_balance = await web3.eth.getBalance(token_owner)
        buyer = accounts[2];
        sad_user = accounts[3];
        attacker = accounts[4];
        alice = accounts[5];
        emo_contract = await EmoToken.deployed();
        emo_owner = accounts[6];
        tokensToLaunch = 1000;
        protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
    });

    it("developer unable to launch without allowance", async() => {
        await expectRevert(
            launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, emo_contract.address, { value: protocolFee, from: emo_owner }),
            "Insuficient allowance"
        )
    });

    it("ending timestamp should be larger than starting timestamp", async() => {

        //increase allowance
        await emo_contract.increaseAllowance(launchpad_contract.address, 10000, { from: emo_owner });

        //calculate time
        const days = 30
        const futureTime = (await time.latest()).add(time.duration.days(days + 1))

        //throw error because ending timestamp is smaller than starting timestamp
        await expectRevert(
            launchpad_contract.launchMyToken(futureTime, 30, 60, 1000, tokensToLaunch, emo_contract.address, { value: protocolFee, from: emo_owner }),
            "something is really wrong here"
        )
    });

    it("should able to start in future", async() => {
        //calculate time 
        const days = 30
        const startTime = (await time.latest()).add(time.duration.days(2))
        const endTime = (await time.latest()).add(time.duration.days(days))

        //execute and verify
        await launchpad_contract.launchMyToken(startTime, days, 60, 1000, tokensToLaunch, emo_contract.address, { value: protocolFee, from: emo_owner })
        const value = await launchpad_contract.launchpads.call(1);
        console.log("Starting timestamp: " + value.startTimeStamp)
        console.log("Ending timestamp: " + value.endTimeStamp)
    });

    it("unable to buy before start timestamp", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(1, { from: buyer, value: minimumPrice }),
            "haven't start yet"
        );
    })

    it("unable to buy after ending timestamp", async() => {
        const value = await launchpad_contract.launchpads.call(1);

        //time travel
        await time.increaseTo(value.endTimeStamp.add(time.duration.days(1)))

        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(1, { from: buyer, value: minimumPrice }),
            "it already ended"
        );
    })

});