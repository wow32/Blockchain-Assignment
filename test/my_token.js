const MyToken = artifacts.require("MyToken");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("MyToken", function (/* accounts */) {
  it("should assert true", async function () {
    await MyToken.deployed();
    return assert.isTrue(true);
  });
});
