/*
 * http://trufflesuite.com/tutorial/#creating-a-user-interface-to-interact-with-the-smart-contract
 * https://ethereum.org/en/developers/tutorials/calling-a-smart-contract-from-javascript/
 * https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#id32
 */


App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        // Load pets.
        $.getJSON('../data.json', function(data) {
            var load = $('#load');
            var template = $('#template');

            for (i = 0; i < data.length; i++) {
                template.find('.card-title').text(data[i].name);
                template.find('img').attr('src', data[i].picture);
                template.find('.card-text').text(data[i].description);
                template.find('.price-tag').text(data[i].price);
                template.find('.startTime').text(data[i].startTimeStamp);
                template.find('.endTime').text(data[i].endTimeStamp);
                template.find('.percentage').text(data[i].acceptancePercentage);
                template.find('.milestone').text(data[i].milestone);
                template.find('.oriTokens').text(data[i].originalAmountofTokens);
                template.find('.totalTokens').text(data[i].totalTokens);
                template.find('.pricePerToken').text(data[i].pricePerToken);
                template.find('.sender').text(data[i].sender);
                template.find('.tokenAddress').text(data[i].tokenAddress);
                template.find('.paid').text(data[i].paid);
                template.find('.creditType').text(data[i].creditType);
                template.find('.btn-buy').attr('data-id', data[i].id);


                load.append(template.html());
            }
        });

        return await App.initWeb3();
    },

    initWeb3: async function() {

        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.request({ method: "eth_requestAccounts" });;
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {

            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        web3.eth.defaultAccount = web3.eth.accounts[0] //solve invalid address error //https://ethereum.stackexchange.com/questions/19524/invalid-address-error-when-interacting-with-a-smart-contract-with-metamask/76065

        return App.initContract();
    },


    initContract: function() {
        $.getJSON('LaunchPad.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with @truffle/contract
            var LaunchPadArtifact = data;
            App.contracts.LaunchPad = TruffleContract(LaunchPadArtifact);

            // Set the LaunchPad for our contract
            App.contracts.LaunchPad.setProvider(App.web3Provider);
            //console.log(data)

            return App.showResult();
            //return App.showLaunchPads();
        });

        $.getJSON('MyToken.json', function(data) {
            var MyTokenArtifact = data;
            App.contracts.MyToken = TruffleContract(MyTokenArtifact);
            App.contracts.MyToken.setProvider(App.web3Provider);
            //console.log(data)
            return App.dummyToken(data);
        });

        //wtf is this?
        //return App.bindEvents();
    },

    showResult: function() {
        var launchPadInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            console.log("Account address: " + accounts)

            App.contracts.LaunchPad.deployed().then(function(instance) {

                launchPadInstance = instance;

                // retrieve owner of contract
                return launchPadInstance.owner({ from: accounts });

            }).then(function(result) {

                console.log("Owner of launchpad contract: " + result)
                return App.displayLaunchPads();

            }).catch(function(err) {
                console.log("Unable to connect contract, is the local node working? Are the contracts deployed?")
                    //console.log(err.message);
            });
        });
    },

    dummyToken: function(data) {
        //this function is for testing a simple token in launchpad, remove in production
        var tokenInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            App.contracts.MyToken.deployed().then(function(instance) {
                tokenInstance = instance;

                // retrieve owner of contract
                return tokenInstance.admin();

            }).then(async function(result) {
                //retrieve contract deployer address
                console.log("Admin of MyToken contract: " + result)

                //retrieve user balance
                const balance = await tokenInstance.balanceOf(result)
                console.log("User balance: " + balance)

                //retrieve launchpad contract address
                var launchpad = await App.contracts.LaunchPad.deployed()
                console.log(await launchpad.owner())
                console.log("LaunchPad contract address: " + launchpad.address)

                //retrieve allowance before increasing it
                const value = await tokenInstance.allowance(accounts, launchpad.address)
                console.log("Current allowance: " + value)

                //handle allowance
                await tokenInstance.increaseAllowance(launchpad.address, 10000);

                const newValue = await tokenInstance.allowance(accounts, launchpad.address)
                console.log("New allowance: " + newValue)

            }).catch(function(err) {
                console.error(err.message);
            });
        });
    },

    displayLaunchPads: function() {
        var launchPadInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            console.log("Account address: " + accounts)

            App.contracts.LaunchPad.deployed().then(function(instance) {

                launchPadInstance = instance;

                // find how many launchpads are available
                return launchPadInstance.totalLaunchpads({ from: accounts });

            }).then(function(result) {

                console.log("Total launchpads: " + result)

                //clear screen by default since it's load from JSON file
                var load = $('#load');
                var template = $('#template');
                load.empty();

                //redeclare variable
                var totalLaunchPads = result;

                if (totalLaunchPads == 0) {

                    console.log("no launchpad detected!")

                } else {

                    console.log("Launchpads detected")

                    //prepare variables to load them via loop
                    var launchpad_info;

                    for (i = 0; i < totalLaunchPads.length; i++) {
                        launchpad_info = launchPadInstance.launchpads.call(i);
                        //take all from here https://github.com/wow32/Blockchain-Assignment/blob/main/contracts/LaunchPad.sol#L15-L25
                        console.log(launchpad_info.sender) //example of retrieving sender
                        template.find('.price-tag').text(launchpad_info.pricePerToken);

                        //append info into UI
                        load.append(template.html());
                    }
                }

            }).catch(function(err) {
                console.error("Error: " + err.message);
            });
        });
    },

   bindEvents: function() {
        $(document).on('click', '.btn-buy', App.handleBuy);
      },

      markBought: function() {
        var adoptionInstance;

        App.contracts.Adoption.deployed().then(function(instance) {
          adoptionInstance = instance;

          return adoptionInstance.getAdopters.call();
        }).then(function(adopters) {
        //   for (i = 0; i < adopters.length; i++) {
        //     if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
        //       $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
        //     }
        //   }
        }).catch(function(err) {
          console.log(err.message);
        });

      },

      handleBuy: function(event) {
        event.preventDefault();

        var launchpadID = parseInt($(event.target).data('id'));
        var adoptionInstance;

        web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

      var account = accounts[0];

       App.contracts.Adoption.deployed().then(function(instance) {
          adoptionInstance = instance;

          // Execute adopt as a transaction by sending account
          return adoptionInstance.adopt(launchpadID, {from: account});
        }).then(function(result) {
          return App.markBought();
        }).catch(function(err) {
          console.log(err.message);
        });
      });

    }

};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
