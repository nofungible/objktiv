(function () {
    var Util = window.Util;

    var COLLECTION_REFRESH_DELAY_IN_MILLIS = 30 * 60 * 1000;

    function TokenManager(state, tokenFetch, tokenIndexer, TokenCollection) {
        this._TokenCollection = TokenCollection;
        this._state = state;
        this._tokenFetch = tokenFetch;
        this._tokenIndexer = tokenIndexer;
        this._addressCollectionMetadataMap = {};
        this._addressCollectionIndexMap = {};
        this._addressLastRefreshedMap = {};
        this._addressDateCursorMap = {};
        this._providerFetchMetadata = {
            addressUpdateTimeoutMap: {}
        };
    }

    TokenManager.prototype.buildCollection = function (address, options) {
        options = options || {};

        var identifier = options.collectionId || address;

        this.stopCollectionBuild(identifier);

        var tokenIndex = this._addressCollectionIndexMap[identifier];

        if (!tokenIndex) {
            console.warn('No collection to build from - fetching collection for address');

            return this.fetchForCollection(address, options)
                .then(function (providerTokenMap) {
                    if (options.onfetch) {
                        options.onfetch(providerTokenMap);
                    }

                    return this.buildCollection(address, options);
                }.bind(this))
                .catch(console.error);
        }

        return new Promise(function (resolve, reject) {
            this._providerFetchMetadata.addressUpdateTimeoutMap[identifier] = setTimeout(function () {
                var tokenQuery = JSON.parse(JSON.stringify(options));
    
                tokenQuery.provider = {};
    
                var providerSet = this._tokenFetch.getTokenProviders().map(function (p) { return p.key; });
                // var platformCollectionMap = tokenIndex.issuerPlatformCollectionMap;
                // var platformSet = Object.keys(platformCollectionMap);
    
                for (var i = 0; i < providerSet.length; i++) {
                    var provider = providerSet[i];
    
                    if (
                        !this._addressCollectionMetadataMap[identifier]
                        || !this._addressCollectionMetadataMap[identifier][provider]
                        || !this._addressCollectionMetadataMap[identifier][provider].isComplete
                    ) {
                        var providerTokenQuery = options.provider && options.provider[provider] || {owner: address};
                        var providerCollection = tokenIndex.issuerPlatformCollectionMap[provider];
                        var tokens = providerCollection ? providerCollection.getAllTokens().tokens : null;
    
                        if (tokens) {
                            providerTokenQuery.before = tokens[tokens.length - 1].createdAt;
                        }
    
                        tokenQuery.provider[provider] = providerTokenQuery;
                    }
                }
    
                console.log('TokenFetch buildCollection query', tokenQuery);
    
                ///// switchw aht you can to fetchForCollection
                return this.fetchForCollection(address, tokenQuery)
                // this._tokenFetch.fetchTokens(tokenQuery)
                    .then(function (results) {
                        console.log('TokenFetch results', results);
    
                        if (options.onfetch) {
                            options.onfetch(results);
                        }
    
                        var newTokenEntries = Object.entries(results);
    
                        for (var i = 0; i < newTokenEntries.length; i++) {
                            var provider = newTokenEntries[i][0];
                            var providerTokens = newTokenEntries[i][1];
    
                            this._addressCollectionMetadataMap[identifier] = this._addressCollectionMetadataMap[identifier] || {};
                            this._addressCollectionMetadataMap[identifier][provider] = this._addressCollectionMetadataMap[identifier][provider] || {attempts: 0};
                            this._addressCollectionMetadataMap[identifier][provider].attempts += 1;
    
                            if (!providerTokens.length) {
                                // @TODO add the provider metadata dictionary when a provider token set is indexed
                                this._addressCollectionMetadataMap[identifier][provider].isComplete = true;
                            }
                        }
    
                        // var tokenList = Object.values(results).reduce(
                        //     function (acc, arr) {
                        //         return acc.concat(arr);
                        //     },
                        //     tokenIndex.totalCollection.getAllTokens().tokens
                        // );
        
                        // var newTokenIndex = this._tokenIndexer.index(tokenList, {address: address});
        
                        // console.log('TokenIndexer results', newTokenIndex);
        
                        // newTokenIndex.totalCollection.save();
        
                        // this._addressCollectionIndexMap[address] = newTokenIndex;
        
                        var isComplete = true;
                        var isFirstPass = true;
    
                        for (var i = 0; i < providerSet.length; i++) {
                            var collectionPlatformMetadata = this._addressCollectionMetadataMap[identifier][providerSet[i]];
    
                            if (!collectionPlatformMetadata || !collectionPlatformMetadata.isComplete) {
                                isComplete = false;
                            }
    
                            if (collectionPlatformMetadata && collectionPlatformMetadata.attempts > 1) {
                                isFirstPass = false;
                            }
                        }
    
                        if (isComplete && !isFirstPass && !options.anonymous) {
                            this._state.assistant.loadText('Token indexing complete!\n\nI\'ll be sure keep your collection up-to-date!');
                        }
    
                        if (!isComplete) {
                            this.buildCollection(address, options);
                        } else {
                            if (options.oncomplete) {
                                options.oncomplete();
                            }
    
                            if (options.refresh) {
                                // Set last refreshed time to now if we finished the collection for the first time.
                                if (!isFirstPass && !this._addressLastRefreshedMap[address]) {
                                    this._addressLastRefreshedMap[address] = Date.now();
    
                                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);
                                }
    
                                console.log('collection is complete - refreshing after delay');
                                this.maintainCollection(address);
                            }
                        }
                    }.bind(this))
                    .then(resolve)
                    .catch(function (err) {
                        console.error('Failed to fetch tokens for collection build', err);
                        reject(err);
                    });
            }.bind(this), 5000);
        }.bind(this));
    };

    // var platformCollectionMap = tokenIndex.issuerPlatformCollectionMap;
    // var platformSet = Object.keys(platformCollectionMap);
    // var allPlatforms = state.tokens._tokenFetch.getTokenProviders().map(function (p) { return p.key; });
    // var newPlatforms = allPlatforms.reduce(function (acc, p) {
    //     return acc.concat(platformSet.indexOf(p) === -1 ? [p] : []);
    // }, []);

    // if (newPlatforms.length) {
    //     // state.assistant.loadText('New token indexer detected.\n\nFetching collection!')

    //     var fetchOptions = newPlatforms.reduce(function (acc, p) {
    //         return (acc.provider[p] = { owner: activeAccount.address }) && acc;
    //     }, {
    //         disableCache: true,
    //         provider: {}
    //     });

    //     return state.tokens.fetchCollection(activeAccount.address, fetchOptions);
    // }

    TokenManager.prototype.loadCollection = function (address) {
        var tokenCollectionForAddress = new this._TokenCollection(address, '*');
        var tokenCache = tokenCollectionForAddress.load();

        console.log('TokenCollection cache', tokenCache);

        if (!tokenCache.tokens.length) {
            return null;
        }

        return this.setCollection(address, tokenCache.tokens);
    }

    TokenManager.prototype.fetchForCollection = function (address, options) {
        options = options || {};

        if (!options.owner && address) {
            options.owner = address;
        }

        if (options.provider) {
            for (var i = 0; i < Object.entries(options.provider).length; i++) {
                var provider = Object.entries(options.provider)[i][0];
                var providerOptions = Object.entries(options.provider)[i][1];

                if (!providerOptions.owner) {
                    options.provider[provider].owner = address;
                }
            }
        }

        return this._tokenFetch.fetchTokens(options)
            .then(function (results) {
                console.log('TokenFetch results', results);

                var existingIndex = this.getCollection(options.collectionId || address);
                var existingTokens = [];

                if (existingIndex) {
                    existingTokens = existingIndex.totalCollection.getAllTokens().tokens;
                }

                var tokenList = Object.values(results).reduce(function (acc, arr) {
                    return acc.concat(arr);
                }, existingTokens);

                this.setCollection(options.collectionId || address, tokenList);

                if (!options.anonymous && options.save !== false) {
                    this.saveCollection(options.collectionId || address);
                }

                return results;
            }.bind(this));
    };

    TokenManager.prototype.getCollection = function (address) {
        if (!this._addressCollectionIndexMap[address]) {
            return null;
        }

        return this._addressCollectionIndexMap[address];
    };

    TokenManager.prototype.getFeed = function () {
        if (!this._addressCollectionIndexMap['FEED']) {
            return null;
        }

        return this._addressCollectionIndexMap['FEED'];
    };

    TokenManager.prototype.maintainCollection = function (address) {
        try {
            var sessionLastRefreshedAt = this._state.session.collectionLastRefreshedAt
                && parseInt(this._state.session.collectionLastRefreshedAt);

            if (!this._addressLastRefreshedMap[address] && sessionLastRefreshedAt) {
                this._addressLastRefreshedMap[address] = sessionLastRefreshedAt;
            }

            if (this._addressLastRefreshedMap[address]) {
                var delta =Date.now() - this._addressLastRefreshedMap[address];

                if (delta < COLLECTION_REFRESH_DELAY_IN_MILLIS) {
                    return setTimeout(function () {
                        this.maintainCollection(address);
                    }.bind(this), COLLECTION_REFRESH_DELAY_IN_MILLIS - delta);
                }
            }

            this.buildCollection(address, {
                collectionId: 'REFRESH:' + address,
                save: false,
                oncomplete: function () {
                    console.log('refresh is complete - resting before refresh')
                    var refreshedTokenIndex = this.getCollection('REFRESH:' + address);

                    this.setCollection(address, refreshedTokenIndex.totalCollection.getAllTokens().tokens);
                    this.saveCollection(address);

                    if (this._state.session.galleryMap) {
                        var galleryMetadata = Object.entries(this._state.session.galleryMap);

                        for (var i = 0; i < galleryMetadata.length; i++) {
                            var galleryId = galleryMetadata[i][0];
                            var tokens = galleryMetadata[i][1].tokens;

                            for (var k = 0; k < tokens.length; k++) {
                                var tid = tokens[k];

                                if (!refreshedTokenIndex.tidTokenMap[tid]) {
                                    this._state.session.galleryMap[galleryId].tokens.splice(k, 1);
                                }
                            }
                        }
                    }

                    var lastRefreshedAt = Date.now();

                    this._state.session.collectionLastRefreshedAt = lastRefreshedAt;
                    this._addressLastRefreshedMap[address] = lastRefreshedAt;

                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);

                    this.deleteCollection('REFRESH:' + address);
                    this.maintainCollection(address);
                }.bind(this)
            });
        } catch (err) {
            console.error('Failed to refresh collection', err);

            throw err;
        }
    };

    TokenManager.prototype.setCollection = function (address, tokenList) {
        this._addressCollectionIndexMap[address] = this._tokenIndexer.index(tokenList, {address: address});
        this._addressCollectionMetadataMap[address] = this._addressCollectionMetadataMap[address] || {};

        return this.getCollection(address);
    };

    TokenManager.prototype.deleteCollection = function (address) {
        var tokenIndex = this.getCollection(address);

        if (!tokenIndex) {
            return false;
        }

        delete this._addressCollectionIndexMap[address];
        delete this._addressCollectionMetadataMap[address];
        delete this._addressLastRefreshedMap[address];

        tokenIndex.totalCollection.delete();

        return null;
    };

    TokenManager.prototype.saveCollection = function (address) {
        var tokenIndex = this.getCollection(address);

        if (!tokenIndex) {
            return false;
        }

        tokenIndex.totalCollection.save();

        return tokenIndex;
    };

    TokenManager.prototype.stopCollectionBuild = function (address) {
        if (!this._providerFetchMetadata.addressUpdateTimeoutMap[address]) {
            return false;
        }

        clearTimeout(this._providerFetchMetadata.addressUpdateTimeoutMap[address]);

        return true;
    };

    window.TokenManager = TokenManager;
})();