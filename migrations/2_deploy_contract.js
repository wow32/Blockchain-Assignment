var LaunchPad = artifacts.require("LaunchPad");
var MyToken = artifacts.require("MyToken");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(LaunchPad, false, { from: accounts[0] }); //not lock the contract
    deployer.deploy(MyToken, { from: accounts[1] });
}