'use strict';

/**
 * OBJKTIV Tezos NFT Viewer
 * https://github.com/nofungible/objktiv
 */

(function main() {
    /**
     * Imports
     */

    var CollectionView = window.CollectionView;
    var EventEmitter = window.EventEmitter;
    var SessionStore = window.SessionStore;
    var TokenArtifactView = window.TokenArtifactView;
    var SettingsManagementView = window.SettingsManagementView;
    var GalleryManagementView = window.GalleryManagementView;
    var Util = window.Util;
    var Wallet = window.Wallet;

    /**
     * Global Constants - Do not change these values.
     */

    var DEPRECATED_SESSION_STORE_KEY = 'objktiv-session-store';
    var DEFAULT_SESSION_STORE_KEY = 'OBJKTIV_SESSION';
    var SYSTEM_SESSION_KEY = 'OBJKTIV_SYSTEM_SESSION';
    var SYSTEM_VERSION = '0.3.0';

    var systemSession = window.localStorage.getItem(SYSTEM_SESSION_KEY);

    if (systemSession) {
        systemSession = JSON.parse(systemSession);
    } else {
        systemSession = {
            version: SYSTEM_VERSION
        };

        window.localStorage.setItem(SYSTEM_SESSION_KEY, JSON.stringify(systemSession));
    }

    /**
     * Global Variables
     */

    // Load current session storage.
    var sessionStore = new SessionStore(DEFAULT_SESSION_STORE_KEY);

    // Set the default session as the current session since we haven't loaded any active wallets yet.
    var state = initState(sessionStore.getSession(), systemSession);

    window.localStorage.removeItem(DEPRECATED_SESSION_STORE_KEY);

    // Attach app components to window element for access via the console.
    window.Objktiv = window.objktiv = {
        state: state,
        sessionStore: sessionStore,
        systemSession: systemSession,
    };

    initUIElements(state);
    attachGestureHandlers(state, sessionStore);
    addEventListeners(state, sessionStore);

    return state.wallet.connect()
        .then(function (activeAccount) {
            if (!activeAccount.anonymous) {
                // If you are signed in and trying to view a gallery redirect to a cleaner, non-anonymous url.
                if (
                    state.urlQuerystrings.gallery
                    && state.urlQuerystrings.tz
                    && activeAccount.address === state.urlQuerystrings.tz
                ) {
                    var decodedGalleryOption = Util.decodeGalleryURIComponent(state, state.urlQuerystrings.gallery);

                    return window.location.replace(Util.getHost() + Util.querystring({
                        view: 'collection',
                        gid: decodedGalleryOption.id
                    }).toString());
                }

                var session = sessionStore.getSession(activeAccount.address);

                if (session) {
                    state.session = session;
                } else {
                    console.warn('No default session set for active account - adding default session');

                    var defaultSession = sessionStore.getDefaultSession();

                    state.session = defaultSession;

                    sessionStore.setSession(activeAccount.address, defaultSession);
                }

                state.eventEmitter.emit(Util.eventKeys.WALLET_SYNC, activeAccount);
            }

            // Start to build anonymous collection if necessary
            if (
                state.urlQuerystrings.tz
                && (activeAccount.anonymous || activeAccount.address !== state.urlQuerystrings.tz)
            ) {
                var fetchOptions = {anonymous: true};
        
                // Build anonymous collection based off of gallery tids.
                if (state.urlQuerystrings.gallery) {
                    state.anonymousGalleryCollection = new window.TokenCollection(state.urlQuerystrings.tz);

                    // Initialize token collection to empty collection.
                    state.anonymousGalleryCollection.setTokens([]);

                    var providerIdentifiersMap = Util.decodeGalleryURIComponent(state, state.urlQuerystrings.gallery);
                    var providers = Object.keys(providerIdentifiersMap);
        
                    fetchOptions.provider = {};
        
                    for (var i = 0; i < providers.length; i++) {
                        var provider = providers[i];
        
                        fetchOptions.provider[provider] = {idList: providerIdentifiersMap[provider]};
                    }

                    // Build remainder of anonymous wallet's collection once gallery tokens are gathered.
                    fetchOptions.oncomplete = function () {
                        console.log('Gallery collection complete - building anonymous collection');

                        return state.tokens.buildCollection(state.urlQuerystrings.tz, {anonymous: true})
                            .catch(function (err) {
                                console.error('Failed to build post-gallery anonymous collection', err);
                            });
                    };

                    fetchOptions.onfetch = function (providerTokenMap) {
                        state.anonymousGalleryCollection.addTokens(Object.values(providerTokenMap).reduce(function (acc, arr) {
                            return acc.concat(arr);
                        }, []));
                    };
                }

                state.tokens.buildCollection(state.urlQuerystrings.tz, fetchOptions)
                    .catch(function (err) {
                        console.error('Failed to build anonymous collection', err);
                    });
            }

            var view;

            if (state.view.type === Util.viewTypes.SETTINGS_MANAGEMENT) {
                view = new SettingsManagementView(state);
            } else if (state.view.type === Util.viewTypes.TOKEN_COLLECTION) {
                view = new CollectionView(state);
            } else if (state.view.type === Util.viewTypes.TOKEN_ARTIFACT) {
                view = new TokenArtifactView(state);
            } else if (state.view.type === Util.viewTypes.GALLERY_MANAGEMENT) {
                view = new GalleryManagementView(state);
            } else {
                return Util.navigateHome();
            }

            view.render();
        })
        .catch(function (err) {
            console.error('failed to connect wallet', err)
        });

    function addEventListeners(state, sessionStore) {
        state.eventEmitter.on(Util.eventKeys.DISPATCH_WALLET_SYNC, function () {
            if (state.wallet.getActiveAccount().anonymous) {
                state.assistant.loadText('Initiating wallet synchronization subroutine!\n\nPlease hold.', {
                    callback: function () {
                        return state.wallet.sync()
                            .then(function() {
                                window.location = Util.getHost();
                            })
                            .catch(console.error);
                    }
                });
            }
        });

        state.eventEmitter.on(Util.eventKeys.DISPATCH_WALLET_UNSYNC, function () {
            if (state.wallet.isSyncing) {
                return false;
            } else if (!state.wallet.getActiveAccount().anonymous) {
                state.assistant.confirm(
                'Are you sure you want to disconnect your wallet?'
                , {
                    confirmCallback: function () {
                        state.assistant.loadText('System rebooting\n.\n.\n.\n.\n.', {
                            wait: 250,
                            callback: function () {
                                setTimeout(function () {
                                    state.wallet.unsync()
                                        .then(function() {
                                            window.location = Util.getHost();
                                        })
                                    .catch(console.error);
                                }.bind(this), 500);
                            }.bind(this)
                        });
                    }
                });
            }
        });

        var toggleNightModeSetting = function (isNightModeEnabled) {
            state.session.nightModeActive = isNightModeEnabled;

            sessionStore.setSession(state.wallet.getActiveAccount().address, state.session);
            state.eventEmitter.emit(state.session.nightModeActive ? Util.eventKeys.NIGHT_MODE_ENABLED : Util.eventKeys.NIGHT_MODE_DISABLED);
            state.eventEmitter.emit(Util.eventKeys.SESSION_SAVE, state.session);
        };

        state.eventEmitter.on(Util.eventKeys.DISPATCH_NIGHT_MODE_ENABLE, function () {
            toggleNightModeSetting(true);
        });

        state.eventEmitter.on(Util.eventKeys.DISPATCH_NIGHT_MODE_DISABLE, function () {
            toggleNightModeSetting(false);
        });

        state.eventEmitter.on(Util.eventKeys.DISPATCH_GALLERY_CREATE, function (galleryData) {
            var newGalleryMeta = {
                id: state.session.galleryIndex,
                displayName: galleryData.name,
                tokens: []
            };

            state.session.galleryMap[state.session.galleryIndex] = newGalleryMeta;

            state.session.galleryIndex += 1;

            sessionStore.setSession(state.wallet.getActiveAccount().address, state.session);
            state.eventEmitter.emit(Util.eventKeys.GALLERY_CREATE, newGalleryMeta);
            state.eventEmitter.emit(Util.eventKeys.SESSION_SAVE, state.session);
        });

        state.eventEmitter.on(Util.eventKeys.DISPATCH_SESSION_SAVE, function (sessionKey, sessionData) {
            sessionKey = sessionKey || state.wallet.getActiveAccount().address;
            sessionData = sessionData || state.session;

            sessionStore.setSession(sessionKey, sessionData);
            state.eventEmitter.emit(Util.eventKeys.SESSION_SAVE, sessionData);
        });

        state.eventEmitter.on(Util.eventKeys.DISPATCH_UPDATE_ITEMS_PER_PAGE, function (itemsPerPage) {
            state.session.itemsPerPage = itemsPerPage;

            sessionStore.setSession(state.wallet.getActiveAccount().address, state.session);
            state.eventEmitter.emit(Util.eventKeys.SESSION_SAVE, state.session);

            state.eventEmitter.emit(Util.eventKeys.UPDATE_ITEMS_PER_PAGE, itemsPerPage);
        });

        state.eventEmitter.on(Util.eventKeys.WALLET_SYNC, function (activeAccount) {
            var session = sessionStore.getSession(activeAccount.address);

            if (!session) {
                var defaultSession = sessionStore.getDefaultSession();

                sessionStore.setSession(activeAccount.address, defaultSession);

                state.session = defaultSession;
            } else {
                state.session = session;
            }

            state.tokens.loadCollection(activeAccount.address);
            state.assistant.loadAvatar();

            var hasGalleries = state.session.galleryMap && Object.keys(state.session.galleryMap).length;

            if (hasGalleries) {
                var galleryMap = state.session.galleryMap;
                var tidTokenMap = state.tokens.getCollection(activeAccount.address).tidTokenMap;

                Object.entries(galleryMap).forEach(function (entry) {
                    var id = entry[0];
                    var tidList = galleryMap[id].tokens;
                    var tokenCollection = new TokenCollection(activeAccount.address, 'TOKEN_COLLECTION_' + id);

                    tokenCollection.setTokens(tidList.reduce(function (acc, tid) {
                        var token = tidTokenMap[tid];

                        if (token) {
                            acc.push(token);
                        }

                        return acc;
                    }, []));

                    galleryMap[id].collection = tokenCollection;
                });
            }

            return state.tokens.fetchForCollection(activeAccount.address)
                .then(function () {
                    return state.tokens.buildCollection(activeAccount.address, {refresh: true});
                });
        });
    }

    function attachGestureHandlers(state) {
        // Close all menus if the user hits escape
        document.addEventListener('keydown', function(evt) {
            if (evt.code && evt.code === 'Escape' || evt.keyCode && evt.keyCode === 27) {
                state.eventEmitter.emit(Util.eventKeys.KEY_ESC);
            }        
        });
    }

    function initUIElements(state) {
        new window.Sidebar(state);

        state.assistant = new window.BasicAssistantEngine(state);
    }

    /**
     * Initialize the volatile client state used for the current user interaction. This is a view/page
     * specific state as opposed to the session storage which holds long term user session data.
     * 
     * @returns {Object} An initialized state object
     */

    function initState(session) {
        /**
         * Gather and parse URL querystrings to identify page options.
         */

        var urlQuerystrings = Util.querystring(window.location.search).toObject();
        var state = {
            eventEmitter: new EventEmitter(),
            session: session,
            urlQuerystrings: urlQuerystrings,
            view: {
                // title: null,
                type: null,
                metadata: {},
                // collection: {
                //     galleryMap: null,
                //     issuer: {
                //         address: null
                //     },
                //     owner: {
                //         address: null
                //     },
                //     pagination: {
                //         isLastPage: false,
                //         pageSkips: [],
                //         skipCounts: {
                //             fxhash: 0,
                //             hic: 0,
                //             objktcom: 0
                //         }
                //     }
                // },
                // title: null,
                // token: {
                //     colorMenuOpen: false,
                //     ipfsUrl: null,
                //     issuer: {
                //         name: null
                //     }
                // }
            },
            wallet: new Wallet({name: 'OBJKTIV'})
        };

        if (state.urlQuerystrings.view === 'settings') {
            state.view.type = Util.viewTypes.SETTINGS_MANAGEMENT;
        } else if (state.urlQuerystrings.view === 'collection') {
            state.view.type = Util.viewTypes.TOKEN_COLLECTION;
        } else if (state.urlQuerystrings.view === 'artifact') {
            state.view.type = Util.viewTypes.TOKEN_ARTIFACT;
        } else if (state.urlQuerystrings.view === 'galleries') {
            state.view.type = Util.viewTypes.GALLERY_MANAGEMENT;
        }

        state.tokens = new window.TokenManager(
            state,
            new window.TokenFetch([
                new window.ObjktcomProvider({
                    contractIgnoreSet: [
                        // hic et nunc
                        'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton',
                        // fxhash
                        'KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE'
                    ]
                }),
                new window.FxhashProvider(),
                new window.HicdexTeiaProvider()
            ]),
            new window.TokenIndexer(window.TokenCollection),
            window.TokenCollection
        );

        return state;
    }
})();
