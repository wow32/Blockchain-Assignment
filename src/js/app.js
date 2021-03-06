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
                template.find('.token').text(data[i].token);
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

    dummyToken: function() {
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
                const balance = await tokenInstance.balanceOf(web3.eth.accounts[0])
                console.log("User balance: " + balance)

                //retrieve launchpad contract address
                var launchpad = await App.contracts.LaunchPad.deployed()
                console.log(await launchpad.owner())
                console.log("LaunchPad contract address: " + launchpad.address)

                //retrieve allowance before increasing it
                const value = await tokenInstance.allowance(accounts, launchpad.address)
                console.log("Current allowance: " + value)

                //handle allowance
                await tokenInstance.increaseAllowance(launchpad.address, 10000, { gas: 3000000 });

                //show new allowance balance
                const newValue = await tokenInstance.allowance(accounts, launchpad.address)
                console.log("New allowance: " + newValue)

                //estimate protocol fee

                const protocolFee = await launchpad.estimateProtocolFee(10000);
                console.log("Protocol fee: " + protocolFee)

                await launchpad.launchMyToken(1, 30, 60, 1000, 10000, tokenInstance.address, { gas: 3000000, value: protocolFee });

            }).catch(function(err) {
                console.error(err.message);
            });
        });
    },

    provideAllowance: function(amount_of_tokens, token_contract) { //Example: App.provideAllowance(10000, "0xfde85664450783268f206c13605cd80d22b41b10")
        //before launching token, developer should run this function so their contract gives allowance to launchpad contract
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            //we are only accepting ERC20, hence we reuse the ABI from MyToken contract
            $.getJSON('MyToken.json', function(data) {
                // var CustomTokenArtifact = data;
                // App.contracts.CustomToken = TruffleContract(CustomTokenArtifact);
                // App.contracts.CustomToken.setProvider(App.web3Provider);

                //Reference: https://web3js.readthedocs.io/en/v1.2.11/web3.html#id12
                var contract = web3.eth.contract(data.abi).at(token_contract);

                console.log(accounts)
                    //must include callback or else will fail
                contract.balanceOf(web3.eth.accounts[0], {}, function(error, result) {
                    if (!error) {
                        console.log("User balance in contract: " + result)
                    } else {
                        console.error(error.code)
                    }
                })

                App.contracts.LaunchPad.deployed().then(function(instance) {

                    launchpad = instance;

                }).then(function(result) {

                    console.log(launchpad.address)

                    contract.increaseAllowance(launchpad.address, amount_of_tokens, {}, function(error, result) {
                        if (!error) {
                            console.log(result)
                        } else {
                            console.error(error.message)
                        }
                    });

                }).catch(function(err) {
                    console.error(err.message);
                });

            });

        })
    },

    //not tested :)
    launchToken: function(_startTime, _numOfDays, _acceptedPercentage, _pricePerToken, _totalTokens, _tokenAddress) {
        //should run provideAllowance before this
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            App.contracts.LaunchPad.deployed().then(function(instance) {

                launchpad = instance;

            }).then(async function(result) {

                console.log(launchpad.address)

                const protocolFee = await launchpad.estimateProtocolFee(10000);
                console.log("Protocol fee: " + protocolFee)

                //Parameters check here: https://github.com/wow32/Blockchain-Assignment/blob/main/contracts/LaunchPad.sol#L85
                contract.launchMyToken(_startTime, _numOfDays, _acceptedPercentage, _pricePerToken, _totalTokens, _tokenAddress, { gas: 3000000, value: protocolFee }, function(error, result) {
                    //should handle conversion, however we don't have time for it :(
                    if (!error) {
                        console.log(result)
                    } else {
                        console.error(error.message)
                    }
                });

            }).catch(function(err) {
                console.error(err.message);
            });


        })
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

            }).then(async function(result) {

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

                    // example of retrieving the mapping :)
                    // var test = await launchPadInstance.launchpads.call(1);
                    // console.log(test[0].c[0])

                    // function convertTimeStampToDate(timestamp) {
                    //     return new Date(timestamp).toLocaleDateString("en-US")
                    // }

                    for (i = 1; i <= totalLaunchPads; i++) {
                        launchpad_info = await launchPadInstance.launchpads.call(i);
                        console.log(launchpad_info)

                        //https://github.com/wow32/Blockchain-Assignment/blob/main/contracts/LaunchPad.sol#L15-L25

                        template.find('.btn-buy').attr('data-id', i);
                        //template.find('.card-title').text("TOKEN");
                        template.find('img').attr('src', "images/token.jpg");
                        template.find('.card-text').text("Description about token");
                        template.find('.token').text(launchpad_info[0].c[0]);
                        template.find('.startTime').text(launchpad_info[0].c[0]);
                        template.find('.endTime').text(launchpad_info[1].c[0]);
                        template.find('.percentage').text(launchpad_info[2].c[0] + "%");
                        template.find('.milestone').text(launchpad_info[3].c[0]);
                        template.find('.oriTokens').text(launchpad_info[4].c[0]);
                        template.find('.totalTokens').text(launchpad_info[5].c[0]);
                        template.find('.pricePerToken').text(launchpad_info[6].c[0]);
                        template.find('.sender').text(launchpad_info[7]);
                        template.find('.tokenAddress').text(launchpad_info[8]);
                        template.find('.paid').text(launchpad_info[9]);
                        template.find('.creditType').text(launchpad_info[10].c[0]);

                        //append info into UI
                        load.append(template.html());
                    }

                    // console.log("ENDED")
                }

            }).catch(function(err) {
                console.error("Error: " + err.message);
            });
        });
    },

    bindEvents: function() {
        $(document).on('click', '.btn-buy', App.handleBuy);
        $(document).on('click', '.allowance', App.provideAllowance(1000, address));
    },



    markBought: function() {
        var adoptionInstance;

        App.contracts.Adoption.deployed().then(function(instance) {
            adoptionInstance = instance;

            return adoptionInstance.getAdopters.call();
        }).then(function(adopters) {
            for (i = 0; i < adopters.length; i++) {
                if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
                    $('.btn-buy').eq(i).find('button').text('Success').attr('disabled', true);
                }
            }
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
                return adoptionInstance.adopt(launchpadID, { from: account });
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