const LaunchPad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");

/*
 * References:
 * https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 * https://medium.com/oli-systems/test-driven-solidity-with-truffle-e4beaa2bd194
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

contract("LaunchPad", (accounts) => {

    before(async() => {
        launchpad_contract = await LaunchPad.deployed();
        token_contract = await MyToken.deployed();
        launchpad_owner = accounts[0];
        token_owner = accounts[1];
    });

    it("should deploy contract", async function() {
        await LaunchPad.deployed();
        return assert.isTrue(true);
    });

    it("should able to give allowance to LaunchPad contract", async() => {
        await token_contract.increaseAllowance(launchpad_contract.address, 10000);
        const value = await token_contract.allowance(accounts[0], launchpad_contract.address);
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
});