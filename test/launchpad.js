const LaunchPad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");

/*
 * References:
 * https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 * https://medium.com/oli-systems/test-driven-solidity-with-truffle-e4beaa2bd194
 */

contract("MyToken", (accounts) => {
    it("should deploy contract", async function() {
        await MyToken.deployed();
        return assert.isTrue(true);
    });

    it("deployer should be accounts[0]", async() => {
        //accounts[0] should be deployer of MyToken contract
        const instance = await MyToken.deployed();
        const value = await instance.admin();
        assert.equal(value, accounts[0]);
        //console.log(accounts[0]);
    });

});

contract("LaunchPad", (accounts) => {
    it("should deploy contract", async function() {
        await LaunchPad.deployed();
        return assert.isTrue(true);
    });

    it("should able to give allowance to LaunchPad contract", async() => {
        const launchpad_contract = await LaunchPad.deployed();
        const token_contract = await MyToken.deployed();
        //console.log(launchpad_contract.address);
        await token_contract.increaseAllowance(launchpad_contract.address, 10000);
        const value = await token_contract.allowance(accounts[0], launchpad_contract.address);
        assert.equal(value, 10000, "Unable to increaseAllowance on Launchpad contract!");
    });
});