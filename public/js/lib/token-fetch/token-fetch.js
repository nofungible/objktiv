// TokenFetch Class
(function () {
    // {
    //     idList,
    //     issuer,
    //     owner,
    // }
    function TokenFetch(providerSet) {
        this._tokenProviderSet = providerSet || [];
    }

    // @TODO cache when you make a call, and don't re do calls. Can stash call responses in memory.
    TokenFetch.prototype.fetchTokens = function (options) {
        options = options || {};

        return Promise.all(
            this._tokenProviderSet.reduce(function (fetchRequests, provider) {
                var query = options;
                var providerKey = provider.key;

                if (options.provider && !options.provider[providerKey]) {
                    return fetchRequests;
                }

                if (options.provider && options.provider[providerKey]) {
                    query = options.provider[providerKey];
                }

                fetchRequests.push(
                    provider.fetchTokens(query)
                        .then(function (results) {
                            return {
                                provider: providerKey,
                                tokens: results
                            };
                        })
                );

                return fetchRequests;
            }, [])
        )
            .then(function (results) {
                return results.reduce(function (acc, providerResults, i) {
                    var provider = providerResults.provider;
                    var tokens = providerResults.tokens;

                    acc[provider] = tokens;

                    return acc;
                }.bind(this), {});
            }.bind(this));
    };

    TokenFetch.prototype.getTokenProviders = function () {
        return this._tokenProviderSet;
    };

    TokenFetch.prototype.loadTokenProvider = function (provider) {
        this._tokenProviderSet.push(provider);
    }

    window.TokenFetch = TokenFetch;
})();