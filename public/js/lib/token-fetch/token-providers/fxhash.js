(function () {
    var Util = window.Util;

    var DEFAULT_LIMIT = 50;
    var HOST = 'https://api.fxhash.xyz/graphql';
    var MINTING_CONTRACT = 'KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE';
    var PLATFORM_KEY = 'FXHASH';
    var PLATFORM_DISPLAY_NAME = 'fx(hash)';
    var PLATFORM_URI = 'https://www.fxhash.xyz';
    var GRAPHQL_TOKEN_PROPERTY_LIST_STRING = '\n      id'
                                           + '\n      assigned'
                                           + '\n      iteration'
                                           + '\n      owner {'
                                           + '\n        id'
                                           + '\n        name'
                                           + '\n        flag'
                                           + '\n        avatarUri'
                                           + '\n        __typename'
                                           + '\n      }'
                                           + '\n      issuer {'
                                           + '\n        name'
                                           + '\n        flag'
                                           + '\n        author {'
                                           + '\n          id'
                                           + '\n          name'
                                           + '\n          flag'
                                           + '\n          avatarUri'
                                           + '\n        }'
                                           + '\n      }'
                                           + '\n      name'
                                           + '\n      metadata'
                                           + '\n      createdAt';

    function FxhashProvider() {
        this._host = HOST;
        this._platformKey = PLATFORM_KEY;
        this._platformDisplayName = PLATFORM_DISPLAY_NAME;
        this._platformUri = PLATFORM_URI;
        this._totalCollectionResponseCache = {};

        this.key = this._platformKey;
    }

    FxhashProvider.prototype.fetchTokens = function(opts) {
        opts = opts || {};
        opts.limit = opts.limit || DEFAULT_LIMIT;

        if (opts.idList && !opts.owner) {
            throw new Error(PLATFORM_KEY + ' token provider cannot query tokens by ID without an owner!');
        } else if (opts.idList && opts.owner) {
            return this._fetchWalletTokenCollectionByTokenId(opts);
        } else {
            return this._fetchGenericTokenSet(opts);
        }
    };

    FxhashProvider.prototype._fetchGenericTokenSet = function (opts) {
        var query = this._parseGraphQLQuery(opts);
        var requestOpts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationName: 'Query',
                query: query
            })
        };

        return Util.request(this._host, requestOpts)
            .then(function (results) {
                var tokens = results
                    && results.data
                    && results.data.user
                    && results.data.user.objkts;

                return tokens ? tokens.map(this._parseTokenMetadata.bind(this)) : [];
            }.bind(this));
    };

    FxhashProvider.prototype._fetchWalletTokenCollectionByTokenId = function (opts) {
        var query = 'query GenerativeTokens($userId: String) {'
                  + 'user(id: $userId) {'
                  + '  entireCollection {'
                  + GRAPHQL_TOKEN_PROPERTY_LIST_STRING
                  + '  }'
                  + '}'
                  + '}';

        var requestOpts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationName: 'GenerativeTokens',
                query: query,
                variables: {
                    userId: opts.owner
                }
            })
        };

        return Util.request(this._host, requestOpts)
            .then(function (results) {
                var tokens = results
                    && results.data
                    && results.data.user
                    && results.data.user.entireCollection;

                if (!tokens || !tokens.length) {
                    return [];
                }

                tokens = tokens.filter(function (token) {
                    return opts.idList.indexOf(token.id) !== -1;
                });

                if (!tokens.length) {
                    return [];
                }

                var filterHandlerMap = {
                    before: function (beforeDate, tokens) {
                        var beforeTimestamp = new Date(beforeDate).getTime();

                        return tokens.filter(function (token) {
                            var tokenTimestamp = new Date(token.createdAt).getTime();

                            return tokenTimestamp < beforeTimestamp;
                        });
                    },
                    after: function (afterDate, tokens) {
                        var afterTimestamp = new Date(afterDate).getTime();

                        return tokens.filter(function (token) {
                            var tokenTimestamp = new Date(token.createdAt).getTime();

                            return tokenTimestamp > afterTimestamp;
                        });
                    },
                    issuer: function (issuerAddress, tokens) {
                        return tokens.filter(function (token) {
                            return token.issuer.address === issuerAddress;
                        });
                    },
                }

                var filterOptions = Object.keys(filterHandlerMap);

                for (var i = 0; i < filterOptions.length; i++) {
                    var filterKey = filterOptions[i];
                    var filterValue = opts[filterKey];

                    if (filterValue) {
                        tokens = filterHandlerMap[filterKey](filterValue, tokens);
                    }
                }

                if (!tokens.length) {
                    return [];
                }
            
                tokens = tokens.sort(function (a, b) {
                    return b.createdAt - a.createdAt;
                });

                var startIndex = opts.skip || 0;
                var endIndex = opts.limit ? startIndex + opts.limit : tokens.length;

                endIndex > tokens.length ? endIndex = tokens.length : endIndex;

                if (startIndex >= endIndex) {
                    return [];
                }

                return tokens.slice(startIndex, endIndex).map(this._parseTokenMetadata.bind(this));
            }.bind(this));
    };

    FxhashProvider.prototype._parseGraphQLQuery = function (opts) {
        var dateConstraint;

        if (opts.before) {
            dateConstraint = 'filters: {createdAt_lt: "' + opts.before + '"}';
        } else if (opts.after) {
            dateConstraint = 'filters: {createdAt_gt: "' + opts.before + '"}';
        }

        var tokenConstraint = !opts.issuer && !opts.limit && !opts.skip
            ? ''
            : '('
                + (dateConstraint ? dateConstraint + ', ' : '')
                + (opts.issuer ? 'author_in: "' + opts.issuer + '", ' : '')
                + (opts.limit ? 'take: ' + opts.limit + ', ' : '')
                + (opts.skip ? 'skip: ' + opts.skip : '')
                + 'sort: {createdAt: "DESC"}'
            + ')';

        var ownerConstraint = opts.owner ? '(id: "' + opts.owner + '")' : '';

        return 'query Query {'
             + '\n  user' + ownerConstraint + ' {'
             + '\n    id'
             + '\n    objkts' + tokenConstraint + ' {'
             + GRAPHQL_TOKEN_PROPERTY_LIST_STRING
             + '\n    }'
             + '\n  }'
             + '\n}';
    };

    FxhashProvider.prototype._parseTokenMetadata = function (token) {
        return {
            count: 1,
            contract: MINTING_CONTRACT,
            createdAt: token.createdAt,
            description: token.metadata.description,
            identifier: token.id,
            ipfsLink: token.metadata.artifactUri,
            displayArtifactIpfsAddress: token.metadata.displayUri,
            issuer: {
                address: token.issuer.author.id,
                handle: token.issuer.author.name,
                platform: this._platformKey,
                platformDisplay: this._platformDisplayName
            },
            name: token.name,
            platformUri: this._platformUri + '/gentk/' + token.id,
            platformIssuerUri: this._platformUri + '/pkh/' + token.issuer.author.id,
            type: 'application',
            mime: 'application/x-directory',
            tid: MINTING_CONTRACT + ':' + token.id
        };
    };

    window.FxhashProvider = FxhashProvider;
})();