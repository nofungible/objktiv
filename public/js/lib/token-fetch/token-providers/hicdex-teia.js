(function () {
    var Util = window.Util;

    var DEFAULT_LIMIT = 50;
    var MINTING_CONTRACT = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton';
    var PLATFORM_KEY = 'HICDEX_TEIA';
    var PLATFORM_DISPLAY_NAME = 'hic et nunc';
    var PLATFORM_URI = 'https://teia.art';
    var HOST = 'https://api.teia.rocks/v1/graphql';

    function HicdexTeiaProvider() {
        this._host = HOST;
        this._platformKey = PLATFORM_KEY;
        this._platformDisplayName = PLATFORM_DISPLAY_NAME;
        this._platformUri = PLATFORM_URI;

        this.key = this._platformKey;        
    }

    HicdexTeiaProvider.prototype.fetchTokens = function(opts) {
        opts = opts || {};
        opts.limit = opts.limit || DEFAULT_LIMIT;

        var query = this._parseGraphQLQuery(opts);
        var requestOpts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationName: 'collectorGallery',
                query: query
            })
        };

        return Util.request(this._host, requestOpts)
            .then(function (results) {
                var tokens = results
                    && results.data
                    && results.data.hic_et_nunc_token_holder;

                return tokens ? tokens.map(this._parseTokenMetadata.bind(this)) : [];
            }.bind(this));
    };

    HicdexTeiaProvider.prototype._parseGraphQLQuery = function (opts) {
        var creatorAddressConstraint = '';

        // If we have an issuer address we set this first as it would supercede all other address constraints.
        if (opts.issuer) {
            creatorAddressConstraint = 'creator: {address: {_eq: "' + opts.issuer + '"}}';
        
        // If we have no issuer address, check to see if we have an owner address, else we have no address constraints.
        } else if (opts.owner) {
            // creatorAddressConstraint = 'creator: {address: {_neq: "' + opts.owner + '"}}';
        }

        var tokenIdConstraint = '';

        if (opts.idList && Array.isArray(opts.idList) && opts.idList.length) {
            // Start the beginning of an _or query list.
            tokenIdConstraint = '_or: [';

            // Iterate through the list of ID's, and append each ID to the _or query list.
            for (var i = 0; i < opts.idList.length; i++) {
                tokenIdConstraint += '{token_id: {_eq: ' + opts.idList[i] + '}}';

                // We want to add a comma between ID's if we aren't on the last one.
                if (i < opts.idList.length - 1) {
                    tokenIdConstraint += ',';
                }
            }

            // Close the _or query list.
            tokenIdConstraint += ']';
        }

        // TODO build this more dynamically. we probably want to construct arrays of arguments to
        // better handle dangling commas with dynamic lists of 0-n length. account for no args vs many.
        // TODO test every arg and consider combinations
        return 'query collectorGallery {'
            + '\n  hic_et_nunc_token_holder('
                + (opts.limit ? 'limit: ' + opts.limit + ', ' : '')
                + (opts.skip ? 'offset: ' + opts.skip + ', ' : '')
                + 'where: {'
                    + (opts.owner ? 'holder_id: {_eq: "' + opts.owner + '"}, ' : '')
                    + (opts.owner ? 'quantity: {_gt: "0"}, ' : '')
                    + (tokenIdConstraint ? tokenIdConstraint + ', ' : '')
                    + (
                        creatorAddressConstraint || opts.after || opts.before
                        ? (
                            'token: {'
                                + (creatorAddressConstraint ? creatorAddressConstraint + ', ' : '')
                                + (
                                    opts.after || opts.before
                                        ? 'timestamp: {' + (opts.after ? '_gt' : '_lt') + ': "' + (opts.after || opts.before) + '"}'
                                        : ''
                                )
                            + '}'
                        )
                        : ''
                    )
                + '}'
                + ', order_by: {token: {timestamp: desc}}'
            + ') {'
                + '\n    token {'
                + '\n      id'
                + '\n      artifact_uri'
                + '\n      display_uri'
                + '\n      thumbnail_uri'
                + '\n      timestamp'
                + '\n      mime'
                + '\n      title'
                + '\n      description'
                + '\n      royalties'
                + '\n      creator {'
                + '\n        address'
                + '\n        name'
                + '\n      }'
                + '\n    }'
                + '\n  }'
            + '\n}';
    };

    HicdexTeiaProvider.prototype._parseTokenMetadata = function (tokenMetadata) {
        var token = tokenMetadata.token;
        var mimeBase = token.mime.split('/')[0];
        var tokenType = mimeBase === 'image' && 'image'
            || mimeBase === 'video' && 'video'
            || mimeBase === 'model' && 'model'
            || 'application';

        return {
            contract: MINTING_CONTRACT,
            count: null,
            createdAt: token.timestamp,
            description: token.description,
            identifier: token.id,
            ipfsLink: token.artifact_uri,
            displayArtifactIpfsAddress: token.display_uri,
            name: token.title,
            issuer: {
                address: token.creator.address,
                handle: token.creator.name,
                platform: this._platformKey,
                platformDisplay: this._platformDisplayName,
            },
            platformUri: this._platformUri + '/objkt/' + token.id,
            platformIssuerUri: this._platformUri + '/tz/' + token.creator.address,
            type: tokenType,
            mime: token.mime,
            tid: MINTING_CONTRACT + ':' + token.id
        };
    }

    window.HicdexTeiaProvider = HicdexTeiaProvider;
})();
