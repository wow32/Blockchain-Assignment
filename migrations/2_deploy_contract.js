var LaunchPad = artifacts.require("LaunchPad");
var MyToken = artifacts.require("MyToken");

module.exports = function(deployer) {
    deployer.deploy(LaunchPad, false); //not lock the contract
    deployer.deploy(MyToken);
}