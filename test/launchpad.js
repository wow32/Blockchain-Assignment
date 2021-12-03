const Launchpad = artifacts.require("LaunchPad");
const MyToken = artifacts.require("MyToken");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Launchpad", function( /* accounts */ ) {
    it("should deploy contract", async function() {
        await Launchpad.deployed();
        return assert.isTrue(true);
    });
});

contract("MyToken", (accounts) => {
    it("should deploy contract", async function() {
        await MyToken.deployed();
        return assert.isTrue(true);
    });

    it("should return the list of accounts", async() => {
        console.log(accounts);
    });

    it("should able to give allowance", async() => {
        console.log(accounts);
    });
});