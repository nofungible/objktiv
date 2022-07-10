(function () {
    var COLLECTION_KEY = 'objktiv-token-collection';
    var DEFAULT_LIMIT = 10;

    function TokenCollection(address, identifier) {
        this._identifier = identifier || null;
        this._address = address || null;
        this._collection = null;

        this._setCacheKey();
    }

    TokenCollection.prototype._filterDuplicateTokens = function (arrayWithDuplicateTokens) {
        var tidMap = {};

        return arrayWithDuplicateTokens.filter(function (token) {
            if (tidMap[token.tid]) {
                return false;
            }

            return tidMap[token.tid] = true;
        });
    };

    TokenCollection.prototype._getMissingTokenMetadata = function () {
        return {
            tokens: [],
            page: 0,
            isLastPage: true
        };
    };

    TokenCollection.prototype._setCacheKey = function () {
        this._cacheKey = COLLECTION_KEY
            + (this._address ? ':' + this._address : '')
            + (this._identifier ? ':' + this._identifier : '');
    };

    TokenCollection.prototype.getAddress = function () {
        return this._address;
    }

    TokenCollection.prototype.setAddress = function (address) {
        this._address = address;

        this._setCacheKey();

        return this.getAddress();
    }

    TokenCollection.prototype.getAllTokens = function () {
        if (!this.hasTokens()) {
            return this._getMissingTokenMetadata();
        }

        return {
            tokens: this._collection,
            page: 0,
            isLastPage: true 
        };
    };

    TokenCollection.prototype.getIdentifier = function () {
        return this._identifier;
    };

    TokenCollection.prototype.setIdentifier = function (identifier) {
        this._identifier = identifier;

        this._setCacheKey();

        return this.getIdentifier();
    };

    TokenCollection.prototype.addTokens = function (newTokens) {
        var tokenList = newTokens;

        if (this.hasTokens()) {
            tokenList = tokenList.concat(this._collection);
        }

        return this.setTokens(tokenList);
    };

    TokenCollection.prototype.getTokens = function (options) {
        if (!this.hasTokens()) {
            return this._getMissingTokenMetadata();
        }

        options = options || {};
        options.page = options.page || 0;
        options.limit = options.limit || DEFAULT_LIMIT;
        options.skip = options.page ? options.page * options.limit : 0;

        var tokenSet = this._collection.slice(
            options.skip,
            options.skip ? options.skip + options.limit : options.limit
        );

        var itemsLeft = this.getTotal() - (options.skip + options.limit);

        return {
            tokens: tokenSet,
            page: options.page,
            isLastPage: itemsLeft <= 0,
        };
    };

    TokenCollection.prototype.setTokens = function (newCollection) {
        this._collection = this._filterDuplicateTokens(newCollection);
        this._collection = this.sortBy('createdAt', 'DESC');

        return this.getAllTokens();
    };

    TokenCollection.prototype.getTotal = function () {
        return this.hasTokens() ? this._collection.length : 0;
    };

    TokenCollection.prototype.hasTokens = function () {
        return !!(this._collection && this._collection.length);
    };

    TokenCollection.prototype.load = function () {
        var jsonString = window.localStorage.getItem(this._cacheKey);

        var tokenArray;

        if (jsonString) {
            try {
                tokenArray = JSON.parse(jsonString);
            } catch (err) {
                console.error('Failed to parse TokenCollection JSON', this._cacheKey, jsonString);
            }

            if (tokenArray && !Array.isArray(tokenArray)) {
                console.error('TokenCollection cache is malformed', tokenArray);

                tokenArray = null;
            }

            if (tokenArray) {
                this.setTokens(tokenArray);
            }
        }

        return this.getAllTokens();
    };

    TokenCollection.prototype.save = function () {
        if (this._collection) {
            window.localStorage.setItem(this._cacheKey, JSON.stringify(this._collection));
        } else {
            console.warn('No collection found for TokenCollection save', this._cacheKey);
        }

        return this.getAllTokens();
    };

    TokenCollection.prototype.delete = function () {
        if (this._collection) {
            window.localStorage.removeItem(this._cacheKey);

            return true;
        }

        return false;
    };

    TokenCollection.prototype.sortBy = function (property, order) {
        var sortPropertyMap = {
            createdAt: function (sortOrder) {
                return this._collection.sort(function (a, b) {
                    var subject1 = sortOrder === 'DESC' ? b : a;
                    var subject2 = sortOrder === 'DESC' ? a : b;

                    return new Date(subject1.createdAt).getTime() - new Date(subject2.createdAt).getTime();
                });
            },
        };

        var targetProperty = property;

        if (!sortPropertyMap.hasOwnProperty(targetProperty)) {
            console.warn('Unknown sort property', targetProperty, 'defaulting to createdAt');

            targetProperty = 'createdAt';
        }

        var targetOrder = order;

        if (!['ASC', 'DESC'].includes(targetOrder)) {
            console.warn('Unknown sort order', targetOrder, 'defaulting to DESC');

            targetOrder = 'DESC';
        }

        return sortPropertyMap[targetProperty].call(this, targetOrder);
    };

    window.TokenCollection = TokenCollection;
})();