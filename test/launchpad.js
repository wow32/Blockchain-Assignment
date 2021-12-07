const LaunchPad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");
const EmoToken = artifacts.require("EmoToken");
const { expectRevert } = require('@openzeppelin/test-helpers');

/*
 * References:
 * https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 * https://medium.com/oli-systems/test-driven-solidity-with-truffle-e4beaa2bd194
 * http://trufflesuite.com/docs/truffle/getting-started/running-migrations#available-accounts
 * https://ethereum.stackexchange.com/questions/64862/migrates-contract-with-specific-account-without-hard-code-address-using-truffle
 * https://ethereum.stackexchange.com/questions/71203/truffle-wont-run-tests-while-initializing-a-global-contract-instance
 * https://ethereum.stackexchange.com/questions/34614/return-a-struct-from-a-mapping-in-test-truffle
 * https://kalis.me/assert-reverts-solidity-smart-contract-test-truffle/
 * https://stackoverflow.com/a/66350050
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/24a0bc23cfe3fbc76f8f2510b78af1e948ae6651/test/token/ERC20/utils/TokenTimelock.test.js
 * https://docs.openzeppelin.com/test-helpers/0.5/api#time
 * https://web3js.readthedocs.io/en/v1.2.11/web3-utils.html#fromwei
 */

contract("MyToken", (accounts) => {

    before(async() => {
        token_contract = await MyToken.deployed();
        token_owner = accounts[1];
    });

    it("should deploy contract", async function() {
        await MyToken.deployed();
        return assert.isTrue(true);
    });

    it("deployer should be accounts[1]", async() => {
        const value = await token_contract.admin();
        assert.equal(value, token_owner);
    });

    it("accounts[1] should have 10000 tokens", async() => {
        const value = await token_contract.balanceOf(token_owner);
        assert.equal(value, 10000 * 10 ** 18, "Error: accounts[1] have tokens of " + value.toString());
    });

});

contract("EmoToken", (accounts) => {

    before(async() => {
        emo_contract = await EmoToken.deployed();
        emo_owner = accounts[6];
    });

    it("should deploy contract", async function() {
        await EmoToken.deployed();
        return assert.isTrue(true);
    });

    it("deployer should be accounts[6]", async() => {
        const value = await emo_contract.admin();
        assert.equal(value, emo_owner);
    });

    it("accounts[6] should have 10000 tokens", async() => {
        const value = await emo_contract.balanceOf(emo_owner);
        assert.equal(value, 10000 * 10 ** 18, "Error: accounts[6] have tokens of " + value.toString());
    });

});

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
    });

    it("should deploy contract", async function() {
        await LaunchPad.deployed();
        return assert.isTrue(true);
    })

    it("should able to give allowance to LaunchPad contract", async() => {
        await token_contract.increaseAllowance(launchpad_contract.address, 10000, { from: token_owner });
        const value = await token_contract.allowance(token_owner, launchpad_contract.address);
        assert.equal(value, 10000, "Error: unable to increaseAllowance on Launchpad contract!");
    });

    it("deployer should be accounts[0]", async() => {
        const value = await launchpad_contract.owner();
        assert.equal(value, launchpad_owner, "Error: owner is " + value.toString());
    });

    it("should estimate protocol fee", async() => {
        //launch with 10000 tokens
        const value = await launchpad_contract.estimateProtocolFee(10000);
        //protocol fee should be 1 ETH
        assert.equal(value, 10 ** 18, "Error: protocol fee is " + value.toString());
    });

    it("developer should able to launch tokens", async() => {
        const tokensToLaunch = 1000;
        // let balance = await web3.eth.getBalance(launchpad_owner);
        // console.log(balance);
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner });
        const value = await launchpad_contract.launchpads.call(1);
        assert.equal(value.tokenAddress, token_contract.address, "Error: Token address in launchpad is not MyToken.sol!");
        assert.equal(value.sender, token_owner, "Error: Owner of launchpad is not developer!");
    });

    it("developer should not able to buy own tokens", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(1, { from: token_owner, value: minimumPrice }),
            "developers cannot buy their own token"
        );
    });

    it("buyer should able to buy all tokens", async() => {
        const totalFee = await launchpad_contract.getMaxBuyValueForToken(1)
        const beforeBuy = await launchpad_contract.launchpads.call(1)
        assert.equal(beforeBuy.tokenAddress, token_contract.address, "Error: Token address in launchpad is not MyToken.sol!")
            //buyer buy all tokens 
        await launchpad_contract.buyLaunchPadToken(1, { value: totalFee, from: buyer })
        const afterBuy = await launchpad_contract.launchpads.call(1)
        assert.equal(afterBuy.totalTokens, 0, "Error: There are still tokens left!")
    });

    it("should not able to buy empty tokens", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1)
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(1, { from: sad_user, value: minimumPrice }),
            "No tokens left"
        )
    })

    it("should able to settle launchpad with empty tokens", async() => {
        await launchpad_contract.settleLaunchPad(1, { from: buyer })
        const value = await launchpad_contract.launchpads.call(1);
        assert.equal(value.creditType, 2, "Error: Buyer credit type is not set to token")
    })

    it("calculate profit for developer", async() => {
        let newBalance = await web3.eth.getBalance(token_owner)
        const profit = newBalance - token_owner_original_balance;
        const profitInEth = web3.utils.fromWei(profit.toString(), "ether")
        console.log("Developer profit: " + profitInEth + " ether")
    })

    it("buyer should able to withdraw tokens", async() => {
        const oldTokenBalance = await token_contract.balanceOf(buyer)
        await launchpad_contract.withdrawCredits(1, { from: buyer })
        const newTokenBalance = await token_contract.balanceOf(buyer)
        const difference = newTokenBalance - oldTokenBalance
        console.log("User received tokens: " + difference)
        assert.notEqual(oldTokenBalance, newTokenBalance, "Error: user token balance is not changed!")
    })

    it("developer should not able launch same token twice", async() => {
        const tokensToLaunch = 1000;
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await expectRevert(
            launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner }),
            "This account has an existing launchpad"
        )
    });

    it("developer should not able launch less than minimum number of days", async() => {
        const checkMe = await launchpad_contract.minNumberofDays()
        const tokensToLaunch = 1000;
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await expectRevert(
            launchpad_contract.launchMyToken(1, checkMe - 1, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner }),
            "too short"
        )
    });

    it("developer should not able launch less than required minimum tokens", async() => {
        const checkMe = await launchpad_contract.minimumTokens()
        const tokensToLaunch = checkMe - 1;
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await expectRevert(
            launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner }),
            "Need more tokens to process"
        )
    });

    it("developer should not able launch more than maximum number of days", async() => {
        const checkMe = await launchpad_contract.maxNumberofDays()
        const tokensToLaunch = 1000;
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await expectRevert(
            launchpad_contract.launchMyToken(1, checkMe + 1, 60, 1000, tokensToLaunch, token_contract.address, { value: protocolFee, from: token_owner }),
            "Whoops, can't be that long"
        )
    });

    it("only admin can change maximum number of days", async() => {
        const checkMe = await launchpad_contract.minNumberofDays()
        await expectRevert(
            launchpad_contract.changeMaxNumOfDays(checkMe + 1, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.changeMaxNumOfDays(checkMe + 1, { from: launchpad_owner })
        const value = await launchpad_contract.maxNumberofDays()
        assert.equal(value, checkMe + 1, "Unable to change maximum number of days")

    })

    it("only admin can change minimum number of days", async() => {
        const checkMe = await launchpad_contract.maxNumberofDays()
        await expectRevert(
            launchpad_contract.changeMinNumOfDays(checkMe - 1, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.changeMinNumOfDays(checkMe - 1, { from: launchpad_owner })
        const value = await launchpad_contract.minNumberofDays()
        assert.equal(value, checkMe - 1)
    })

    it("only admin can change minimum tokens", async() => {
        await expectRevert(
            launchpad_contract.changeMinimumTokens(1, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.changeMinimumTokens(1, { from: launchpad_owner })
        const value = await launchpad_contract.minimumTokens()
        assert.equal(value, 1)
    })

    it("only admin can lock contract", async() => {
        await expectRevert(
            launchpad_contract.lockContract(true, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.lockContract(true, { from: launchpad_owner })
        const isLock = await launchpad_contract.isLocked()
        assert.equal(isLock, true)
    })

    it("only admin can change fee", async() => {
        await expectRevert(
            launchpad_contract.changeFee(10, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.changeFee(10, { from: launchpad_owner })
        const feeValue = await launchpad_contract.fee()
        assert.equal(feeValue, 10)
    })

    it("only admin can change owner", async() => {
        await expectRevert(
            launchpad_contract.changeOwner(attacker, { from: attacker }),
            "Only owner can execute"
        )
        await launchpad_contract.changeOwner(alice, { from: launchpad_owner })
        const admin = await launchpad_contract.owner()
        assert.equal(admin, alice)
    })

    it("developer unable to launch if contract locked", async() => {
        const tokensToLaunch = 1000;
        const protocolFee = await launchpad_contract.estimateProtocolFee(tokensToLaunch);
        await expectRevert(
            launchpad_contract.launchMyToken(1, 30, 60, 1000, tokensToLaunch, emo_contract.address, { value: protocolFee, from: emo_owner }),
            "Contract is locked by admin"
        )
        await launchpad_contract.lockContract(false, { from: alice })
    });

    it("owner can remove malicious launchpad", async() => {
        //clean up
        const checkMe = await launchpad_contract.maxNumberofDays()

        //create new launchpad because duplicate launchpads are not allowed
        await emo_contract.increaseAllowance(launchpad_contract.address, 10000, { from: emo_owner });
        const protocolFee = await launchpad_contract.estimateProtocolFee(1000);
        await launchpad_contract.launchMyToken(1, checkMe - 1, 60, 1000, 1000, emo_contract.address, { value: protocolFee, from: emo_owner });

        //user buy
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        launchpad_contract.buyLaunchPadToken(2, { from: buyer, value: minimumPrice })

        //remove launchpad
        await launchpad_contract.removeLaunchPad(2, { from: alice });

        //verify
        const value = await launchpad_contract.launchpads.call(2);
        assert.equal(value.totalTokens, 0)
        assert.equal(value.paid, true)
        assert.equal(value.creditType, 1)
    });

    it("user able to get their refund from malicious token", async() => {
        //record user old balance
        const oldTokenBalance = await web3.eth.getBalance(buyer)

        //buyer withdraw ETH
        await launchpad_contract.withdrawCredits(2, { from: buyer })

        //record new user balance
        const newTokenBalance = await web3.eth.getBalance(buyer)

        //logging
        console.log("User old balance: " + web3.utils.fromWei(oldTokenBalance.toString(), "ether"))
        console.log("User new balance: " + web3.utils.fromWei(newTokenBalance.toString(), "ether"))
    })

    it("developer cannot settle launchpad", async() => {
        await expectRevert(
            launchpad_contract.settleLaunchPad(2, { from: emo_owner }),
            "This launchpad has been settled"
        )
    })

    it("buyer unable to buy malicious token after removed by admin", async() => {
        const minimumPrice = await launchpad_contract.retrievePriceForToken(1);
        await expectRevert(
            launchpad_contract.buyLaunchPadToken(2, { from: buyer, value: minimumPrice }),
            "No tokens left"
        )
    })

});