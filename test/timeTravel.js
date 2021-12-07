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

        //calculate difference
        const contractDiff = launchpad_balance - new_launchpad_balance

        //logging
        console.log("Contract's left ETH: " + web3.utils.fromWei(contractDiff.toString(), "ether"))
        console.log("User old balance: " + web3.utils.fromWei(oldTokenBalance.toString(), "ether"))
        console.log("User new balance: " + web3.utils.fromWei(newTokenBalance.toString(), "ether"))
        assert.notEqual(oldTokenBalance, newTokenBalance, "Error: user token balance is not changed!")
    })

    it("buyer cannot withdraw more than one time", async() => {
        //expect fail since already withdrawn
        await expectRevert(
            launchpad_contract.withdrawCredits(1, { from: buyer }),
            "nothing to withdraw"
        )
    })

    it("should allow user withdraw once percentage accepted", async() => {

        //create new launchpad because duplicate launchpads are not allowed
        await token_contract.increaseAllowance(launchpad_contract.address, 10000, { from: token_owner });
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner });

        //calculate required ETH to purchase tokens
        const value = await launchpad_contract.launchpads.call(2);
        console.log("Milestone required: " + value.milestone)
        const priceInEth = 10 ** 18 / value.pricePerToken
        const amount = priceInEth * value.milestone
        console.log("Price in ETH to achieve milestone: " + web3.utils.fromWei(amount.toString(), "ether"))
        await launchpad_contract.buyLaunchPadToken(2, { value: amount, from: buyer })

        //verify enough tokens bought to trigger milestone
        const creditValue = await launchpad_contract.userCredits.call(buyer);
        expect(creditValue.credits).to.eql(value.milestone)

        //settle launchpad and withdraw
        await launchpad_contract.settleLaunchPad(2, { from: buyer })
        await launchpad_contract.withdrawCredits(2, { from: buyer })

        //tokens withdraw, user credit should be 0
        const _creditValue = await launchpad_contract.userCredits.call(buyer);
        assert.equal(_creditValue.credits.toNumber(), 0, "Error: User withdrawn but credit is not 0!")
    });

    it("should allow settle launchpad after ending timestamp", async() => {
        //skip to launchpad ending timestamp
        const oldValue = await launchpad_contract.launchpads.call(2);
        await time.increaseTo(oldValue.endTimeStamp.add(time.duration.days(1)))

        //verification
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(2, { from: buyer, value: minimumPrice }),
            "it already ended"
        );

        //is the developer paid?
        const value = await launchpad_contract.launchpads.call(2);
        console.log("Is the developer paid? " + value.paid)
        assert.equal(value.paid, false, "Developer is set to paid but it's actually not")
        console.log("Developer address: " + value.sender)
        assert.equal(value.sender, token_owner, "Error: Developer address is incorrect!")

        //settle launchpad and pay ETH to dev
        await launchpad_contract.settleLaunchPad(2, { from: buyer })

        //user shouldn't able to withdraw again, despite settle launchpad twice
        await expectRevert(
            launchpad_contract.withdrawCredits(1, { from: buyer }),
            "nothing to withdraw"
        )
    })

    it("owner should able withdraw additional tokens", async() => {
        // const balance = await token_contract.balanceOf(launchpad_contract.address)
        // console.log(balance)

        await launchpad_contract.retrieveAdditionalTokens(2, { from: launchpad_owner })

        //verify that owner indeed have additional tokens
        const value = await launchpad_contract.launchpads.call(2);
        const shouldHave = value.totalTokens

        const balanceInContract = await token_contract.balanceOf(launchpad_owner)
        expect(shouldHave).to.eql(balanceInContract)
    })

});