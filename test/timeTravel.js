const LaunchPad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");
const EmoToken = artifacts.require("EmoToken");
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
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

    it("buyer able to buy after start timestamp", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        console.log("Buyer sent ETH: " + web3.utils.fromWei(minimumPrice.toString(), "ether"))

        const value = await launchpad_contract.launchpads.call(1);

        // increase after starting time stamp
        await time.increaseTo(value.startTimeStamp.add(time.duration.days(1)))

        // buyer buy tokens
        await launchpad_contract.buyLaunchPadToken(1, { from: buyer, value: minimumPrice })

        // verify totalTokens is decreased
        const afterBuy = await launchpad_contract.launchpads.call(1)
        assert.equal(afterBuy.totalTokens, value.totalTokens - 1, "Error: value of totalTokens is not decreased!")

    })

    it("user credit(token) is increased", async() => {
        // verify user credit (token) is increased
        const creditValue = await launchpad_contract.userCredits.call(buyer);
        assert.equal(creditValue.tokenAddress, emo_contract.address, "Error: CreditPerLaunchPad tokenAddress is not developer ERC20 token address!")
        assert.equal(creditValue.credits, 1, "Error: user credit value is not increased!")
    })

    it("user weiSent(ETH) is increased", async() => {
        //verify user weiSent (msg.value) is increased
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        const creditValue = await launchpad_contract.userCredits.call(buyer);
        expect(creditValue.weiSent).to.eql(minimumPrice)
    })

    it("unable to settle launchpad before milestone", async() => {
        await expectRevert(
            launchpad_contract.settleLaunchPad(1, { from: buyer }),
            "Milestone not achieved yet!"
        );
    })

    it("unable to buy after ending timestamp", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        const value = await launchpad_contract.launchpads.call(1);

        //time travel
        await time.increaseTo(value.endTimeStamp.add(time.duration.days(1)))

        await expectRevert(
            launchpad_contract.buyLaunchPadToken(1, { from: buyer, value: minimumPrice }),
            "it already ended"
        );
    })

    it("should able to settle launchpad after ending timestamp", async() => {
        await launchpad_contract.settleLaunchPad(1, { from: buyer })
        const value = await launchpad_contract.launchpads.call(1);

        //milestone not achieved, launchpad will fail
        assert.equal(value.creditType, 1, "Error: Buyer credit type is not set to ETH")
    })

    it("buyer should able to withdraw ETH", async() => {
        //find buyer's weiSent available to withdraw
        const value = await launchpad_contract.userCredits.call(buyer);
        console.log("Buyer's weiSent available to withdraw: " + web3.utils.fromWei(value.weiSent.toString(), "ether"))

        //check contract balance
        const launchpad_balance = await web3.eth.getBalance(launchpad_contract.address)

        //record user old balance
        const oldTokenBalance = await web3.eth.getBalance(buyer)

        //buyer calls withdrawCredits, gets a refund of ETH
        await launchpad_contract.withdrawCredits(1, { from: buyer })

        //record new user balance
        const newTokenBalance = await web3.eth.getBalance(buyer)

        //record new contract balance
        const new_launchpad_balance = await web3.eth.getBalance(launchpad_contract.address)

        const contractDiff = launchpad_balance - new_launchpad_balance
        const userDiff = newTokenBalance - oldTokenBalance

        //logging
        console.log("Contract's left ETH: " + web3.utils.fromWei(contractDiff.toString(), "ether"))
        console.log("User old balance: " + web3.utils.fromWei(oldTokenBalance.toString(), "ether"))
        console.log("User new balance: " + web3.utils.fromWei(newTokenBalance.toString(), "ether"))
        assert.notEqual(oldTokenBalance, newTokenBalance, "Error: user token balance is not changed!")
    })

});