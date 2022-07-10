(function () {
    function TokenIndexer(TokenCollection) {
        this._TokenCollection = TokenCollection;
    }

    TokenIndexer.prototype.index = function (tokenList, options) {
        options = options || {};

        var tokenCollection = new this._TokenCollection(options.address, '*');

        tokenCollection.setTokens(tokenList);

        var issuerAddressCollectionMap = {};
        var issuerPlatformCollectionMap = {};
        var issuerContractCollectionMap = {};
        var tokenMimeTypeCollectionMap = {};
        var tokenTypeCollectionMap = {};
        var tidTokenMap = {};
        var tokens = tokenCollection.getAllTokens().tokens;
 
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];

            _setTokenToMapArray(token, token.issuer.address, issuerAddressCollectionMap);
            _setTokenToMapArray(token, token.issuer.platform, issuerPlatformCollectionMap);
            _setTokenToMapArray(token, token.contract, issuerContractCollectionMap);
            _setTokenToMapArray(token, token.mime, tokenMimeTypeCollectionMap);
            _setTokenToMapArray(token, token.type, tokenTypeCollectionMap);

            tidTokenMap[token.tid] = token;
        }

        return {
            tidTokenMap: tidTokenMap,
            totalCollection: tokenCollection,
            issuerAddressCollectionMap: _convertMapValuesToCollections.call(this, issuerAddressCollectionMap, options.address, 'ISSUER_ADDRESS'),
            issuerPlatformCollectionMap: _convertMapValuesToCollections.call(this, issuerPlatformCollectionMap, options.address, 'ISSUER_PLATFORM'),
            issuerContractCollectionMap: _convertMapValuesToCollections.call(this, issuerContractCollectionMap, options.address, 'ISSUER_CONTRACT'),
            tokenMimeTypeCollectionMap: _convertMapValuesToCollections.call(this, tokenMimeTypeCollectionMap, options.address, 'TOKEN_MIME'),
            tokenTypeCollectionMap: _convertMapValuesToCollections.call(this, tokenTypeCollectionMap, options.address, 'TOKEN_TYPE')
        };

        function _setTokenToMapArray(token, key, map) {
            if (!map[key]) {
                map[key] = [];
            }

            map[key].push(token);

            return map;
        }

        function _convertMapValuesToCollections(map, address, identifier) {
            return Object.entries(map).reduce(function (acc, kv) {
                var key = kv[0];
                var tokenArray = kv[1];
                var collection = new this._TokenCollection(address, identifier);

                collection.setTokens(tokenArray);

                acc[key] = collection;

                return acc;
            }.bind(this), {});
        }
    };

    window.TokenIndexer = TokenIndexer;
})();