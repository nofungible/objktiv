'use strict';

// SessionStore Class
(function() {
    var DEFAULT_VIEWER_BG_COLOR = 'black';
    var DEFAULT_PER_PAGE = 10;
    var GATEWAY_LIST = [
        'https://ipfs.io',
        'https://cloudflare-ipfs.com',
        'https://gateway.pinata.cloud'
    ];

     /**
     * SessionStore manages the applications in memory data stores. This data is persisted via browser local storage.
     * 
     * @param {String} storeKey The local storage key used to gather persisted session data.
     */
      function SessionStore(storeKey) {
        /**
         * Set the SessionStore instances storeKey and retrieve the session data from local storage.
         */

        this._storeKey = storeKey;

        this.loadStore();

        // Create and save a default session store if none exists.
        if (!this._store) {
            this.loadDefaultStore();
            this.saveStore();
        }
    }

    SessionStore.prototype.getDefaultSession = function () {
        return {
            nightModeActive: false,
            itemsPerPage: DEFAULT_PER_PAGE,
            viewerBgColor: DEFAULT_VIEWER_BG_COLOR,
            galleryIndex: 0,
            galleryMap: {},
            defaultGateway: GATEWAY_LIST[0],
            gatewayList: GATEWAY_LIST
        };
    }

    /**
     * Load a default SessionStore data into memory.
     */
    SessionStore.prototype.loadDefaultStore = function() {
        this._store = {
            default: this.getDefaultSession(),
        };
    };

    /**
     * Load a specific wallet's session into memory or the default session
     * if no sessionKey is provided.
     * @param {String} sessionKey Key used in SessionStore data map lookup.
     * @returns {undefined}
     */
    SessionStore.prototype.getSession = function(sessionKey) {
        if (this._store) {
            return sessionKey ? this._store[sessionKey] : this._store.default;
        } else {
            throw new Error('No SessionStore._store loaded');
        }
    }

    SessionStore.prototype.getStore = function () {
        return this._store;
    };

    SessionStore.prototype.setStore = function (storeData) {
        // @TODO use JSONSchema or something to ensure storeData structure
        var stringifiedData;

        try {
            stringifiedData = JSON.stringify(storeData);
        } catch (err) {
            console.error('Failed to stringify new SessionStore store data');

            throw err;
        }

        window.localStorage.setItem(this._storeKey, stringifiedData);

        this._store = storeData;

        return this._store;
    };

    /**
     * Load the session store into memory from local storage.
     */
    SessionStore.prototype.loadStore = function() {
        var localStorageSessionStore = window.localStorage.getItem(this._storeKey);
    
        if (localStorageSessionStore) {
            try {
                var parsedSessionStore = JSON.parse(localStorageSessionStore);
    
                this._store = parsedSessionStore;

                return this._store;
            } catch (err) {
                console.error('Failed to parse session store loaded from localStorage');
    
                throw err;
            }
        }
    };

    /**
     * Set the given session data to a specific wallet's session, or to the default session
     * if no sessionKey is given.
     * @param {String} sessionKey The wallet address to set the session for.
     * @param {Object} session The session to set into the session store.
     * @returns {undefined}
     */
    SessionStore.prototype.setSession = function(sessionKey, session) {
        this._store[sessionKey || 'default'] = session;

        this.saveStore();
    }

    /**
     * Persist the session store via local storage.
     */
    SessionStore.prototype.saveStore = function() {
        if (this._store) {
            window.localStorage.setItem(this._storeKey, JSON.stringify(this._store));
        }
    }

    window.SessionStore = SessionStore;
})();
