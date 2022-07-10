// Wallet Class
(function() {
    var BeaconWallet = beacon.DAppClient;

    function Wallet(config) {
        var defaultName = 'Default dApp Name';
        var defaultConfig = {
            name: defaultName
        };

        this.setActiveAccount(this._getPlaceholderAccount());

        this._beaconClient = null;
        this._config = config || defaultConfig;
        this._config.name = this._config.name || defaultName;

        this.isSyncing = false;
    }
    
    Wallet.prototype.connect = function() {
        var self = this;

        return new Promise(function(resolve, reject) {
            try {
                self._beaconClient = new BeaconWallet({
                    name: self._config.name,
                    eventHandlers: {
                        ACTIVE_ACCOUNT_SET: {
                            handler: function (activeBeaconAccount) {
                                try {
                                    console.log('Beacon Wallet SDK initialized', activeBeaconAccount);
        
                                    if (activeBeaconAccount && activeBeaconAccount.address) {
                                        self.setActiveAccount({address: activeBeaconAccount.address, anonymous: false});
                                    }

                                    resolve(self.getActiveAccount());
                                } catch (err) {
                                    reject(err);
                                }
                            }
                        }
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    Wallet.prototype.getActiveAccount = function() {
        return this._activeAccount;
    };

    Wallet.prototype._getPlaceholderAccount = function() {
        return Object.create({address: null, anonymous: true});
    }

    Wallet.prototype.setActiveAccount = function(account) {
        var account = {
            address: account.address,
            anonymous: account.anonymous || false
        };

        this._activeAccount = account;

        return this.getActiveAccount();
    };

    Wallet.prototype.sync = function() {
        this.isSyncing = true;

        var self = this;

        return this._beaconClient.requestPermissions()
            .then(function () {
                return self._beaconClient.getAccounts();
            })
            .then(function (addressList) {
                self.isSyncing = false;

                if (addressList.length) {
                    self.setActiveAccount(addressList[0]);
                }

                return self.getActiveAccount();
            })
            .catch(function (err) {
                self.isSyncing = false;

                console.error('Failed to sync wallet');

                throw err;
            });
    };

    Wallet.prototype.unsync = function () {
        this.isSyncing = true;

        var self = this;

        return this._beaconClient.removeAllAccounts()
            .then(function() {
                self.isSyncing = false;
                self._activeAccount = {address: null, anonymous: true};

                return self.getActiveAccount();
            })
            .catch(function (err) {
                self.isSyncing = false;

                console.error('Failed to unsync wallet');

                throw err;
            });
    };

    window.Wallet = Wallet;
})();
