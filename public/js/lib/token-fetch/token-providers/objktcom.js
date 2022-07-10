(function () {
    var Util = window.Util;

    var DEFAULT_LIMIT = 50;
    var HOST = 'https://data.objkt.com/v2/graphql';
    var PLATFORM_KEY = 'OBJKTCOM';
    var PLATFORM_DISPLAY_NAME = 'objkt.com';
    var PLATFORM_URI = 'https://objkt.com';

    function ObjktcomProvider(options) {
        this._host = HOST;
        this._options = options || {};
        this._platformKey = PLATFORM_KEY;
        this._platformDisplayName = PLATFORM_DISPLAY_NAME;
        this._platformUri = PLATFORM_URI;

        this.key = this._platformKey;
    }

    ObjktcomProvider.prototype.fetchTokens = function(options) {
        options = options || {};
        options.limit = options.limit || DEFAULT_LIMIT;

        var query = this._parseGraphQLQuery(options);
        var requestOpts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationName: 'FetchTokens',
                query: query,
            })
        };

        return Util.request(this._host, requestOpts)
            .then(function (results) {
                var tokens = results
                    && results.data
                    && results.data.token_holder;

                return !tokens
                    ? []
                    : tokens.map(function (tokenMetadata) {
                        return this._parseTokenMetadata(tokenMetadata, options);
                    }.bind(this));
            }.bind(this));
    };

    // ObjktcomProvider.prototype.parseGalleryURIComponent = function (tokenTidList) {
    //     var contractTokenIdMap = {};

    //     for (var i = 0; i < tokenTidList.length; i++) {
    //         var tid = tokenTidList[i];
    //         var delimiterIndex = tid.indexOf(':');
    //         var contract = tid.slice(0, delimiterIndex);
    //         var tokenId = tid.slice(delimiterIndex + 1, tid.length);

    //         contractTokenIdMap[contract] = contractTokenIdMap[contract] || [];
    //         contractTokenIdMap[contract].push(tokenId);
    //     }

    //     return contractTokenIdMap;
    // };

    // ObjktcomProvider.prototype.unparseGalleryURIComponent = function (contractTokenIdListMap) {
    //     var contractList = Object.keys(contractTokenIdListMap);
    //     var tidList = [];

    //     for (var i = 0; i < contractList.length; i++) {
    //         var contract = contractList[i];
    //         var tokenIdList = contractTokenIdListMap[contract];

    //         for (var k = 0; k < tokenIdList.length; k++) {
    //             var tokenId = tokenIdList[k];

    //             tidList.push(contract + ':' + tokenId);
    //         }
    //     }

    //     return tidList;
    // };


    // @TODO add support for tokenQueryParameters.issuer
    ObjktcomProvider.prototype._parseGraphQLQuery = function (options) {
        var timestampQuery;

        if (options.before) {
            timestampQuery = 'timestamp: {_lt: "' + options.before + '"}';
        } else if (options.after) {
            timestampQuery = 'timestamp: {_gt: "' + options.after + '"}';
        }

        return 'query FetchTokens {'
            + '\n  token_holder('
                + (options.limit ? 'limit: ' + options.limit + ', ' : '')
                + (options.skip ? 'offset: ' + options.skip + ', ' : '')
                + 'where: {'
                    + (options.idList ? 'token_pk: {_in: [' + options.idList.join(',') + ']}' : '')
                    + (options.owner ? 'holder_address: {_eq: "' + options.owner + '"}, ': '')
                    + 'token: {'
                        + (timestampQuery ? timestampQuery + ', ' : '')
                        + (options.owner ? 'fa: { creator: { address: {} } }, ' : '')
                        + (
                            !this._options.contractIgnoreSet || !this._options.contractIgnoreSet.length
                            ? ''
                            : this._options.contractIgnoreSet.reduce(function (acc, contract, i) {
                                if (i === 0) {
                                    acc = 'fa_contract: {_neq: "' + contract + '"}';
                                } else if (i === 1) {
                                    acc += ', _and: {fa_contract: {_neq: "' + contract + '"}}'
                                } else {
                                    acc = acc.slice(0, acc.length - 1) + ', _and: {fa_contract: {_neq: "' + contract + '"}}}';
                                }

                                return acc;
                            }, '')
                        )
                    + '}, '
                    + 'quantity: {_gt: "0"}'
                + '}'
                + ', order_by: {token: {timestamp: desc}}'
            + ') {'
            + '\n    token {'
            + '\n      pk'
            + '\n      description'
            + '\n      display_uri'
            + '\n      token_id'
            + '\n      timestamp'
            + '\n      artifact_uri'
            + '\n      name'
            + '\n      mime'
            + '\n      fa {'
            + '\n        collection_id'
            + '\n        contract'
            + '\n        creator {'
            + '\n          address'
            + '\n          alias'
            + '\n          tzdomain'
            + '\n        }'
            + '\n        description'
            + '\n        editions'
            + '\n        name'
            + '\n      }'
            + '\n      creators {'
            + '\n        holder {'
            + '\n          address'
            + '\n          alias'
            + '\n        }'
            + '\n      }'
            + '\n      holders {'
            + '\n          quantity'
            + '\n          holder_address'
            + '\n      }'
            + '\n    }'
            + '\n  }'
            + '\n}';
    };

    ObjktcomProvider.prototype._parseTokenMetadata = function (tokenMetadata, options) {
        var mimeBase = tokenMetadata.token.mime.split('/')[0];
        var tokenType = mimeBase === 'image' && 'image'
            || mimeBase === 'video' && 'video'
            || mimeBase === 'model' && 'model'
            || 'application';

        return {
            contract: tokenMetadata.token.fa.contract,
            count: !options.owner ? null : tokenMetadata.token.holders.reduce(function (acc, holder) {
                return holder.holder_address === options.owner ? holder.quantity : acc;
            }, 0),
            createdAt: tokenMetadata.token.timestamp,
            description: tokenMetadata.token.description,
            identifier: tokenMetadata.token.pk,
            ipfsLink: tokenMetadata.token.artifact_uri,
            displayArtifactIpfsAddress: tokenMetadata.token.display_uri,
            name: tokenMetadata.token.name,
            issuer: {
                address: tokenMetadata.token.fa.creator.address,
                handle: tokenMetadata.token.fa.creator.alias,
                platform: this._platformKey,
                platformDisplay: tokenMetadata.token.fa.name,
            },
            platformUri: this._platformUri + '/asset/' + tokenMetadata.token.fa.contract + '/' + tokenMetadata.token.token_id,
            platformIssuerUri: this._platformUri + '/profile/' + tokenMetadata.token.fa.creator.address + '/created',
            type: tokenType,
            mime: tokenMetadata.token.mime,
            tid: PLATFORM_KEY + ':' + tokenMetadata.token.pk
        };
    }

    window.ObjktcomProvider = ObjktcomProvider;
})();
