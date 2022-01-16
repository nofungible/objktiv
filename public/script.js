(function () {
    // var footerFlare = document.getElementById('next-page-control-flare');

    // function replaceEmoji() {
    //     if (footerFlare) {
    //         var newEmoji = randomEmoji();

    //         if (newEmoji !== footerFlare.innerText) {
    //             footerFlare.innerText = newEmoji;
    //         } else {
    //             replaceEmoji();
    //         }
    //     }
    // }

    // setInterval(replaceEmoji, 200);
   
   //////////

    var DEFAULT_PER_PAGE = 10;
    var DEFAULT_VIEWER_BG_COLOR = 'black';
    var SESSION_STORE_KEY = 'objktiv-session-store';
    var DEFAULT_BG_COLOR_OPTIONS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'];
    var DEFAULT_SESSION = {
        nightModeActive: false,
        itemsPerPage: DEFAULT_PER_PAGE,
        viewerBgColor: DEFAULT_VIEWER_BG_COLOR,
        galleryIndex: 0,
        galleryMap: {}
    };

    var DEFAULT_SESSION_STORE = {
        default: JSON.parse(JSON.stringify(DEFAULT_SESSION)),
    };

    var sessionStore = window.localStorage.getItem(SESSION_STORE_KEY);
    var globalWalletClient;

    if (!sessionStore) {
        var storeString = JSON.stringify(DEFAULT_SESSION_STORE);

        window.localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(DEFAULT_SESSION_STORE));

        // Re parse JSON string to get cloned version.
        sessionStore = JSON.parse(storeString);
    } else {
        sessionStore = JSON.parse(sessionStore);
    }

    var DEFAULT_STATE = {
        wallet: {},
        isSyncingWallet: true, // must be set to false by event handlers below for sync button to enable
        isLastPage: false,
        itemsPerPage: DEFAULT_PER_PAGE,
        skipCounts: {
            hic: 0,
            fxhash: 0,
        },
        pageSkips: [],
        session: sessionStore.default,
    };

    var state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    var BeaconWallet = beacon.DAppClient;
    var beaconWalletClient;

    applySessionPreferences();
    attachHandlers(); 

    const urlSearchParamsObj = new URLSearchParams(window.location.search);
    const urlQuerystrings = Object.fromEntries(urlSearchParamsObj.entries());

    // Display viewer window
    if (urlQuerystrings.ipfs) {
        spawnWalletInstance(function(successful) {
            if (!successful) {
                return false;
            }

            state.session = sessionStore[state.wallet.address] || state.session;

            applySessionPreferences();

            var selectedColor = state.session.viewerBgColor;

            document.getElementById('selected-bg-color').style.background = selectedColor;
            document.getElementById('viewer-window-content').style.background = selectedColor;
        });

        if (urlQuerystrings.title) {
            console.log(urlQuerystrings.title)
            document.title = urlQuerystrings.title;
            document.getElementById('objkt-name').innerHTML = urlQuerystrings.title;
        }

        if (urlQuerystrings.issuer) {
            document.getElementById('objkt-name').innerHTML = document.getElementById('objkt-name').innerHTML + '<br id="objkt-title-break"><span id="objkt-title-space">&nbsp;</span>by ' + urlQuerystrings.issuer;
        }

        if (urlQuerystrings.night) {
            setNightMode(urlQuerystrings.night === 'true');
        }
 
        var selectedColor = urlQuerystrings.bg || state.session.viewerBgColor;

        document.getElementById('selected-bg-color').style.background = selectedColor;
        document.getElementById('viewer-window-content').style.background = selectedColor;

        for (let i = 0; i < DEFAULT_BG_COLOR_OPTIONS.length; i++) {
            addViewerBackgroundColorOption(DEFAULT_BG_COLOR_OPTIONS[i]);
        }

        document.getElementById('nav').classList.add('hidden');
        document.getElementById('header').classList.add('hidden');
        document.getElementById('footer').classList.add('hidden');
        document.getElementById('footer-push').classList.add('hidden');
        document.getElementById('viewer-window').classList.remove('hidden');


        var url = urlQuerystrings.ipfs;
        var contentType = urlQuerystrings.type;
        var elementMap = {
            image: '<div id="image-resource" style="background-image: url(' + url + ')"></div>',
            video: '<video id="video-resource" autoplay loop controls muted><source src="' + url + '"></video>',
            model: '<model-viewer id="model-resource" src="' + url + '" camera-controls ar ar-modes="webxr scene-viewer quick-look"></model-viewer>',
        };

        var type = contentType.split('/')[0];

        if (elementMap[type]) {
            document.getElementById('viewer-window-content').innerHTML = elementMap[type];
        } else {
            var iframeEl = document.createElement('iframe');

            iframeEl.setAttribute('id', 'interactive-resource');

            document.getElementById('viewer-window-content').appendChild(iframeEl);
            iframeEl.setAttribute('src', url);
        }

        return true;
    }

    if (urlQuerystrings.tz) {
        state.wallet = {address: urlQuerystrings.tz, anonymous: true};

        var galleryJSON;

        if (urlQuerystrings.gallery) {
            galleryJSON = decodeURIComponent(urlQuerystrings.gallery);

            state.galleryJSON = galleryJSON = JSON.parse(galleryJSON);
        }

        spawnWalletInstance(function(successful) {
            if (!successful || !urlQuerystrings.gallery || state.wallet.address !== urlQuerystrings.tz) {
                state.wallet = {address: urlQuerystrings.tz, anonymous: true};

                document.getElementById('header-cta').classList.remove('hidden');
                document.getElementById('sync').classList.add('hidden');
                document.getElementById('galleries-link').classList.add('hidden');
                document.getElementById('wallet-lookup-container').classList.add('hidden');
            } else {
                state.session = sessionStore[state.wallet.address] || state.session;

                applySessionPreferences();
                enableSyncUI();
            }

            populateCollection(galleryJSON).then(console.log, console.log);
        });
    } else {
        spawnWalletInstance(function(successful) {
            if (!successful) {
                return false;
            }

            state.session = sessionStore[state.wallet.address] || state.session;

            applySessionPreferences();
            enableSyncUI();
            
            return populateCollection().then(resolve, reject);
        });
    }

    function spawnWalletInstance(cb) {
        globalWalletClient = state.walletClient = new BeaconWallet({
            name: 'OBJKTIV',
            eventHandlers: {
                ACTIVE_ACCOUNT_SET: {
                    handler: function (account) {
                        console.log('ACTIVE ACCOUNT SET', account)
                        state.isSyncingWallet = false;

                        if (!account || !account.address) {
                            return cb(false);
                        }

                        state.wallet = account;

                        cb(true);
                    }
                }
            }
        });

// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.ACKNOWLEDGE_RECEIVED, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.ACTIVE_ACCOUNT_SET, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.ACTIVE_TRANSPORT_SET, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.BROADCAST_REQUEST_ERROR, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.BROADCAST_REQUEST_SENT, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.BROADCAST_REQUEST_SUCCESS, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.CHANNEL_CLOSED, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.HIDE_UI, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.INTERNAL_ERROR, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.LOCAL_RATE_LIMIT_REACHED, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.NO_PERMISSIONS, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.OPERATION_REQUEST_ERROR, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.OPERATION_REQUEST_SENT, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.OPERATION_REQUEST_SUCCESS, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PAIR_INIT, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PAIR_SUCCESS, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PERMISSION_REQUEST_ERROR, () => {
            console.log('permissions request aborted');
            state.isSyncingWallet = false;
        });
globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PERMISSION_REQUEST_SENT, () => {
            console.log('permissions request aborted');
            state.isSyncingWallet = false;
        });
globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PERMISSION_REQUEST_SUCCESS, () => {
            console.log('permissions request aborted');
            state.isSyncingWallet = false;
        });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.SHOW_PREPARE, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.SIGN_REQUEST_ERROR, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.SIGN_REQUEST_SENT, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.SIGN_REQUEST_SUCCESS, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });
// globalWalletClient.subscribeToEvent(beacon.BeaconEvent.UNKNOWN, () => {
//             console.log('permissions request aborted');
//             state.isSyncingWallet = false;
//         });


        globalWalletClient.subscribeToEvent(beacon.BeaconEvent.NO_PERMISSIONS, () => {
            console.log('permissions request aborted');
            state.isSyncingWallet = false;
        });

        globalWalletClient.subscribeToEvent(beacon.BeaconEvent.PERMISSION_REQUEST_SENT, () => {
            console.log('permissions request aborted');
            state.isSyncingWallet = false;
        });
    }

    function applySessionPreferences() {
        if (state.session.nightModeActive) {
            document.body.classList.add('night');
            state.isNightModeActive = state.session.nightModeActive
        }
    
        if (state.session.itemsPerPage) {
            document.getElementById('items-per-page').innerText = state.session.itemsPerPage;
            state.itemsPerPage = state.session.itemsPerPage;
        }
    }

    function randomEmoji() {
      var emoji = ['🌴', '🍕', '🎙️', '❤️', '🔥', '🔈','📻','🎵','🎶'];

      return emoji[Math.floor(Math.random() * emoji.length)]
    }

    function addViewerBackgroundColorOption(newColor) {
        const colorMenu = document.getElementById('bg-color-picker-menu');
        const colorOption = document.createElement('div');

        colorOption.style.background = newColor;

        colorOption.classList.add('color-option');
        colorOption.setAttribute('data-color', newColor);
        colorOption.addEventListener('click', function() {
            state.session.viewerBgColor = newColor;

            storeSession();

            document.getElementById('viewer-window-content').style.background = newColor;
            document.getElementById('selected-bg-color').style.background = newColor;

            var urlSegments = window.location.href.split('?');
            var urlParams = urlSegments[1];
            var newUrl = null;

            if (urlParams) {
                urlParams = new URLSearchParams(urlParams);

                urlParams.delete('bg');

                var colorOrHash = newColor;

                if (DEFAULT_BG_COLOR_OPTIONS.indexOf(colorOrHash) === -1) {
                    colorOrHash = '#' + colorOrHash;
                }

                newUrl = urlSegments[0] + '?' + urlParams.toString() + '&bg=' + encodeURIComponent(colorOrHash);

                // window.location.href = newUrl;
                window.history.pushState({}, document.title, newUrl);
            }

            
            closeColorPickerMenu();
        });

        colorMenu.appendChild(colorOption);
    }

    function closeColorPickerMenu() {
        state.viewerColorMenuOpen = false;

        document.getElementById('bg-color-picker-menu').classList.add('hidden');
        document.getElementById('hex-color-picker-container').classList.add('hidden');
    }

    function attachHandlers() {
        document.getElementById('title-subheading').addEventListener('click', function() {
            window.location.href = window.location.href.split('#')[0].split('?')[0];
        });

        document.getElementById('title').addEventListener('click', function() {
            window.location.href = window.location.href.split('#')[0].split('?')[0];
        });

        document.getElementById('galleries-link').addEventListener('click', function(evt) {
            openGalleryMenu();
            evt.preventDefault();
        });

        document.getElementById('gallery-list-exit').addEventListener('click', function() {
            document.getElementById('gallery-list-container').classList.add('hidden');
        });

        var newGallerySubmitHandler = function(evt) {
            var newGalleryName = document.getElementById('new-gallery-input').textContent;

            if (newGalleryName) {
                document.getElementById('new-gallery-input').textContent = '';
                state.session.galleryMap[state.session.galleryIndex] = {
                    displayName: newGalleryName,
                    hic: [],
                    fxhash: [],
                };

                state.session.galleryIndex += 1;

                storeSession();
                renderGalleryList();
            }

            evt.stopPropagation();
            evt.preventDefault();
        };

        document.getElementById("new-gallery-input").addEventListener('keypress', function(e) {
            if (e.code && e.code === 'Enter' || e.keyCode && e.keyCode === 13) {
                e.preventDefault();
    
                newGallerySubmitHandler();
            }
        });

        document.getElementById('new-gallery-submit').addEventListener('click', newGallerySubmitHandler);
        // document.getElementById('viewer-window').addEventListener('click', function() {
        //     closeColorPickerMenu();
        // });

        document.getElementById('selected-bg-color').addEventListener('click', function(e) {
            if (!state.viewerColorMenuOpen) {
                openColorPickerMenu();
                state.viewerColorMenuOpen = true;
            } else {
                closeColorPickerMenu();
            }

            e.stopPropagation();
        });

        var hexColorSubmitHandler = function() {
            let newColor = document.getElementById('hex-color-picker').textContent;

            newColor = newColor.replace('#', '');
        
            if (newColor.length === 3 ||
                 newColor.length === 6) {
                document.getElementById('selected-bg-color').style.background = '#' + newColor;
                document.getElementById('viewer-window-content').style.background = '#' + newColor;

                state.session.viewerBgColor = '#' + newColor;

                storeSession();
                addViewerBackgroundColorOption('#' + newColor);

                var urlSegments = window.location.href.split('?');
                var urlParams = urlSegments[1];
                var newUrl = null;
    
                if (urlParams) {
                    urlParams = new URLSearchParams(urlParams);
    
                    urlParams.delete('bg');
    
                    var colorOrHash = newColor;
    
                    if (DEFAULT_BG_COLOR_OPTIONS.indexOf(colorOrHash) === -1) {
                        colorOrHash = '#' + colorOrHash;
                    }
    
                    newUrl = urlSegments[0] + '?' + urlParams.toString() + '&bg=' + encodeURIComponent(colorOrHash);
    
                    window.history.pushState({}, document.title, newUrl);
                    // window.location.href = newUrl;
                }    
            }

            closeColorPickerMenu();
        };

        document.getElementById("hex-color-picker").addEventListener('keypress', function(e) {
            if (e.code && e.code === 'Enter' || e.keyCode && e.keyCode === 13) {
                e.preventDefault();
    
                hexColorSubmitHandler();
            }
        });

        document.getElementById('hex-color-picker-submit').addEventListener('click', hexColorSubmitHandler);

        document.getElementById("wallet-lookup-input").addEventListener("input", function() {
            const text = document.getElementById("wallet-lookup-input").innerText;

            document.getElementById("wallet-lookup-input").innerHTML = '';
            document.getElementById("wallet-lookup-input").innerText = '';
            document.getElementById("wallet-lookup-input").innerText = text.replace('\n', '');
        }, false);

        var walletLookupSubmitHandler = function() {
            var tzAddress = document.getElementById('wallet-lookup-input').textContent;

            if (tzAddress) {
                window.location.href = window.location.href.split('?')[0].replace('#', '') + '?tz=' + tzAddress;
            }
        };

        document.getElementById("wallet-lookup-input").addEventListener('keypress', function(e) {
            if (e.code && e.code === 'Enter' || e.keyCode && e.keyCode === 13) {
                e.preventDefault();
    
                walletLookupSubmitHandler();
            }
        });

        document.getElementById('wallet-lookup-submit').addEventListener('click', walletLookupSubmitHandler);

        document.getElementById('exit-anon').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = window.location.href.split('?')[0];
        });

        document.getElementById('day-night-toggle').addEventListener('click', function (e) {
            if ((document.body.getAttribute('class') || '').indexOf('night') === -1) {
                setNightMode(true);
            } else {
                setNightMode(false);
            }

            e.preventDefault();

            return false;
        });

        document.getElementById('sync').addEventListener('click', function (e) {
            if (!state.wallet.address && !state.isSyncingWallet) {
                state.walletClient.requestPermissions()
                    .then(function () {
                        return state.walletClient.getAccounts();
                    })
                    .then(function (addressList) {
                        state.wallet = addressList[0];
                        state.isSyncingWallet = false;
                        // handler will populate collection
                    })
                    .catch(console.log);
            } else if (state.wallet.address && !state.isSyncingWallet) {
                state.isSyncingWallet = true;

                state.walletClient.removeAllAccounts()
                .then(function() {
                    state.wallet = {};

                    disableSyncUI();

                    document.getElementById('main-content').innerHTML = '';
                    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
                    state.isSyncingWallet = false;
                    state.walletClient = globalWalletClient;

                    disablePageUI();
                }).catch(console.log);
            }
        });

        document.getElementById('increase-items-per-page').addEventListener('click', function (e) {
            modifyItemsPerPage(1);
        });

        document.getElementById('decrease-items-per-page').addEventListener('click', function (e) {
            modifyItemsPerPage(0);
        });

        var navigateNextPage = function(evt) {
            if (Array.prototype.slice.call(evt.target.classList, 0).indexOf('disabled') !== -1) {
                evt.stopPropagation();
                evt.preventDefault();

                return false;
            }

            document.getElementById('next-page-controls').classList.add('hidden');
            populateCollection(state.galleryJSON);
        };

        document.getElementById('next-page').addEventListener('click', navigateNextPage);
        document.getElementById('next-page-mobile').addEventListener('click', navigateNextPage);

        var navigatePreviousPage = function(evt) {
            if (Array.prototype.slice.call(evt.target.classList, 0).indexOf('disabled') !== -1) {
                evt.stopPropagation();
                evt.preventDefault();

                return false;
            }

            if (state.pageSkips.length) {
                state.skipCounts = state.pageSkips.splice(state.pageSkips.length - 2, 2)[0];
            } else {
                resetSkipCounts();
            }

            document.getElementById('next-page-controls').classList.add('hidden');
            populateCollection(state.galleryJSON);
        };

        document.getElementById('previous-page').addEventListener('click', navigatePreviousPage);
        document.getElementById('previous-page-mobile').addEventListener('click', navigatePreviousPage);
    }

    function setNightMode(isNightModeActive) {
        if (isNightModeActive) {
            document.body.classList.add('night');

            state.session.nightModeActive = true;
        } else {
            document.body.classList.remove('night');

            state.session.nightModeActive = false;
        }

        storeSession();
    }

    function openColorPickerMenu() {
        document.getElementById('bg-color-picker-menu').classList.remove('hidden');
        document.getElementById('hex-color-picker-container').classList.remove('hidden');
    }

    function createObjktContainer(objkt) {
        const container = document.createElement('div');

        container.classList.add('objkt-container');

        const preview = document.createElement('div');

        preview.classList.add('preview');
        preview.addEventListener('click', function () {
            var bgColor = state.session.viewerBgColor;
            var uri = window.location.href.split('?')[0].replace('#', '')
                + '?ipfs=' + encodeURIComponent(objkt.gatewayUri)
                + '&type=' + encodeURIComponent(objkt.type)
                + '&title=' + encodeURIComponent(objkt.name)
                + '&issuer=' + encodeURIComponent(objkt.issuer.handle)
                + '&night=' + encodeURIComponent(state.session.nightModeActive)
                + '&bg=' + encodeURIComponent(bgColor);

            var windowSettings = 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no';
            window.open(uri ,Date.now().toString(), windowSettings);
            // window.open(objkt.gatewayUri,'winname','directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no');
        });

        const resource = document.createElement('div');

        resource.style.backgroundImage = 'url(' + objkt.displayImgUri + ')';
        resource.classList.add('resource');

        const metadata = document.createElement('div');

        metadata.classList.add('objkt-metadata');

        const artist = document.createElement('a');

        artist.classList.add('artist');
        artist.setAttribute('href', objkt.platformIssuerUri);
        artist.setAttribute('target', 'blank');

        artist.innerText = 'by ' + objkt.issuer.handle;

        const title = document.createElement('a');

        title.classList.add('title');
        title.setAttribute('href', objkt.platformUri);
        title.setAttribute('target', 'blank');

        title.innerText = objkt.name;

        const ipfsLink = document.createElement('a');

        ipfsLink.classList.add('ipfs-link');

        ipfsLink.setAttribute('href', objkt.ipfsLink);
        ipfsLink.setAttribute('target', 'blank');

        ipfsLink.innerText = objkt.ipfsLink.substr(0, 20) + '...';

        const gatewayLink = document.createElement('a');

        gatewayLink.classList.add('gateway-link');

        gatewayLink.setAttribute('href', objkt.gatewayUri);
        gatewayLink.setAttribute('target', 'blank');

        gatewayLink.innerText = objkt.gatewayUri.substr(0, 30) + '...';

        const objktComLink = document.createElement('a');

        objktComLink.classList.add('objkt-com-link');
        objktComLink.setAttribute('target', 'blank');

        objktComLink.setAttribute('href', objkt.objktComLink);

        objktComLink.innerText = objkt.objktComLink.substr(0, 30) + '...';

        var objktGallerySettings = document.createElement('div');

        objktGallerySettings.innerText = '🖼️';

        objktGallerySettings.classList.add('objkt-gallery-settings');
        objktGallerySettings.addEventListener('click', function() {
            openGalleryMenu(objkt);
        });

        metadata.appendChild(title);
        metadata.appendChild(document.createElement('br'));
        metadata.appendChild(artist);
        metadata.appendChild(document.createElement('br'));
        metadata.appendChild(document.createElement('br'));
        metadata.appendChild(objktComLink);
        metadata.appendChild(gatewayLink);
        metadata.appendChild(ipfsLink);
        preview.appendChild(resource);
    
        if (!state.wallet.anonymous) {
            metadata.appendChild(objktGallerySettings);
        }
    
        container.appendChild(preview);
        container.appendChild(metadata);

        return container;  
    }

    // TODO you need to check marketplace totals and see if you even CAN get more given a page #
    function loadWalletTokens(address, galleryMap) {
        // TODO skip count per smart contractperPage
        // var skipCount = state.page ? state.page * state.itemsPerPage : 0;
        var perPage = Math.floor(state.itemsPerPage * 1.5);
        var promises = [];
    
        var henIdList = galleryMap && galleryMap.hic;
        var henConstraint = '';
        var henShouldQuery = true;

        if (Array.isArray(henIdList) && henIdList.length) {
            /**
             * The hic indexer allows us to query by ID + wallet holder, so we can search for gallery objkts directly.
             */
            henConstraint = ', _or: [';

            for (let i = 0; i < henIdList.length; i++) {
                henConstraint += '{token_id: {_eq: ' + henIdList[i] + '}}';

                if (i < henIdList.length -1) {
                    henConstraint += ',';
                }
            }

            henConstraint += ']';
        } else if (Array.isArray(henIdList)) {
            henShouldQuery = false;
        }

        promises.push(!henShouldQuery ? Promise.resolve(null) : fetch('https://hdapi.teztools.io/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: "\nquery collectorGallery($address: String!) {\n  hic_et_nunc_token_holder(limit: " + perPage + ", offset: " + state.skipCounts.hic + ", where: {holder_id: {_eq: $address}, token: {creator: {address: {_neq: $address}}}, quantity: {_gt: \"0\"} " + henConstraint + "}, order_by: {token_id: desc}) {\n    token {\n      id\n      artifact_uri\n      display_uri\n      thumbnail_uri\n      timestamp\n      mime\n      title\n      description\n      supply\n      royalties\n      creator {\n        address\n        name\n      }\n    }\n  }\n}\n",
                variables: {
                    address: address,
                },
                operationName: 'collectorGallery'
            })
        }));

        var fxhashIdList = galleryMap && galleryMap.fxhash;
        var fxhashConstraint = '(take: ' + perPage + ', skip: ' + state.skipCounts.fxhash + ')';
        var fxhashShouldQuery = true;

        if (Array.isArray(fxhashIdList) && fxhashIdList.length) {
            /**
             * The fxhash indexer does not have pagination, and querying by objkt id and retrieving
             * owners, so if we are looking for specific objkts (for gallery) we need the entire list.
             */

            fxhashConstraint = '';
        } else if (Array.isArray(fxhashIdList)) {
            fxhashShouldQuery = false;
        }

        promises.push(!fxhashShouldQuery ? Promise.resolve(null) : fetch('https://api.fxhash.xyz/graphql', {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "operationName": "Query",
                "variables": {
                    "id": address,
                },
                "query": "query Query($id: String!) {\n  user(id: $id) {\n    id\n    objkts" + fxhashConstraint + " {\n      id\n      assigned\n      iteration\n      owner {\n        id\n        name\n        flag\n        avatarUri\n        __typename\n      }\n      issuer {\n        name\n        flag\n        author {\n          id\n          name\n          flag\n          avatarUri\n          __typename\n        }\n        __typename\n      }\n      name\n      metadata\n      createdAt\n      offer {\n        id\n        price\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
            }),
        }));

        return Promise.all(promises)
        .then((res) => Promise.all(res.map((d) => !d ? d : d.json())))
        .then(([hic, fxhash]) => {
            /**
             * Our fxhash indexer does not support querying by id, so if we are in gallery
             * view we need to search through all objkts to find the correct ones.
             */

            if (
                galleryMap
                && galleryMap.fxhash
                && galleryMap.fxhash.length
                && (fxhash && fxhash.data && fxhash.data.user && fxhash.data.user.objkts && fxhash.data.user.objkts.length)) {
                fxhash.data.user.objkts = fxhash.data.user.objkts.filter(function(o) {
                    return fxhashIdList.indexOf(o.id) !== -1;
                });

                if (fxhash.data.user.objkts.length <= state.skipCounts.fxhash) {
                    fxhash.data.user.objkts = [];
                } else {
                    fxhash.data.user.objkts.splice(0, state.skipCounts.fxhash);

                    if (fxhash.data.user.objkts.length > state.itemsPerPage) {
                        state.skipCounts.fxhash = state.skipCounts.fxhash.slice(0, state.itemsPerPage);
                    }
                }
            }

            return {
                hic: !hic
                    || !hic.data
                    || !hic.data.hic_et_nunc_token_holder
                    ? [] : hic.data.hic_et_nunc_token_holder.map((o) => {
                    var tokenType;
                    var ipfsGatewayHost;
                    var mimeBase = o.token.mime.split('/')[0];

                    if (mimeBase === 'image' || mimeBase === 'model') {
                        ipfsGatewayHost = 'https://cloudflare-ipfs.com/ipfs/';
                    } else {
                        ipfsGatewayHost = 'https://gateway.pinata.cloud/ipfs/';
                    }

                    tokenType = mimeBase === 'image' && 'image'
                        || mimeBase === 'video' && 'video'
                        || mimeBase === 'model' && 'model'
                        || 'web';

                    return {
                        count: o.token.supply,
                        createdAt: o.token.timestamp,
                        description: o.token.description,
                        displayImgIpfsHash: o.token.display_uri.substr(7),
                        displayImgUri: 'https://cloudflare-ipfs.com/ipfs/' + o.token.display_uri.substr(7), 
                        gatewayUri: ipfsGatewayHost + o.token.artifact_uri.substr(7), 
                        identifier: o.token.id,
                        ipfsLink: o.token.artifact_uri,
                        name: o.token.title,
                        issuer: {
                            address: o.token.creator.address,
                            avatarIpfsHash: null,
                            handle: o.token.creator.name || truncateAddress(o.token.creator.address),
                            platform: 'HIC',
                        },
                        objktComLink: 'https://objkt.com/asset/hicetnunc/' + o.token.id,
                        platformUri: 'https://hicetnunc.art/objkt/' + o.token.id,
                        platformIssuerUri: 'https://objkt.com/profile/' + o.token.creator.address + '/created/?fa2=KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton',
                        resourceIpfsHash: o.token.artifact_uri.substr(7),
                        type: tokenType
                    }
                }),
                fxhash: !fxhash
                    || !fxhash.data
                    || !fxhash.data.user
                    || !fxhash.data.user.objkts
                    ? [] : fxhash.data.user.objkts.map((o) => ({
                    count: 1,
                    createdAt: o.createdAt,
                    description: o.metadata.description,
                    displayImgIpfsHash: o.metadata.displayUri.substr(7),
                    displayImgUri: 'https://cloudflare-ipfs.com/ipfs/' + o.metadata.displayUri.substr(7),
                    gatewayUri: 'https://gateway.fxhash.xyz/ipfs/' + o.metadata.artifactUri.substr(7), 
                    identifier: o.id,
                    ipfsLink: o.metadata.displayUri,
                    issuer: {
                        address: o.issuer.author.id,
                        avatarIpfsHash: o.issuer.author.avatarUri.substr(7),
                        handle: o.issuer.author.name || truncateAddress(o.issuer.author.id),
                        platform: 'FXHASH',
                    },
                    name: o.name,
                    objktComLink: 'https://objkt.com/asset/fxhashgenesis/' + o.id,
                    platformUri: 'https://www.fxhash.xyz/gentk/' + o.id,
                    platformIssuerUri: 'https://www.fxhash.xyz/pkh/' + o.issuer.author.id,
                    resourceIpfsHash: o.metadata.artifactUri.substr(7),
                    type: 'web',
                })),
            };
        })
        .then((collectionMap) => {
            return Object.values(collectionMap).reduce((acc, c) => acc.concat(c), []).sort(function (a, b) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        })
        .then((sortedCollection) => {
            if (!sortedCollection.length) {
                return false;
            }

            if (sortedCollection.length <= state.itemsPerPage) {
                state.isLastPage = true;
            } else {
                state.isLastPage = false;
            }

            var selectedCollection = sortedCollection.slice(0, state.itemsPerPage);

            state.pageSkips.push(JSON.parse(JSON.stringify(state.skipCounts)));
            console.log('unincreased skip counts', state.skipCounts)

            for (let i = 0; i < selectedCollection.length; i++) {
                var objkt = selectedCollection[i];
                var platform = objkt.issuer.platform.toLowerCase();

                state.skipCounts[platform] += 1;
            }

            console.log('increased skip counts', state.skipCounts)

            return selectedCollection;
        })
        .catch(console.log);
    }

    function truncateAddress(tz) {
        return tz.substr(0, 5) + '...' + tz.substr(tz.substr.length - 5, tz.substr.length);
    }

    function modifyItemsPerPage(modifier) {
        const countOptions = [10, 25, 50, 100];
        const currentOption = countOptions.indexOf(state.itemsPerPage);
        const shouldIncrease = modifier && currentOption !== countOptions.length - 1;
        const shouldDecrease = !modifier && currentOption !== 0;

        let newOption;

        if (shouldIncrease) {
            newOption = countOptions[currentOption + 1];
        } else if (shouldDecrease) {
            newOption = countOptions[currentOption - 1];
        }

        if (newOption) {
            state.session.itemsPerPage = newOption;

            storeSession();
            resetSkipCounts();

            state.itemsPerPage = newOption;
            state.pageSkips = [];

            document.getElementById('items-per-page').innerText = newOption;

            populateCollection(state.galleryJSON);
        }
    }

    function resetSkipCounts() {
        var platforms = Object.keys(state.skipCounts);

        for (let i = 0; i < platforms.length; i++) {
            state.skipCounts[platforms[i]] = 0;
        }
    }

    function openGalleryMenu(objkt) {
        document.getElementById('gallery-list-container').classList.remove('hidden');
        renderGalleryList(objkt);
    }

    function populateCollection(galleryMap) {
        const contentContainer = document.getElementById('main-content');

        contentContainer.innerHTML = '';

        return loadWalletTokens(state.wallet.address, galleryMap)
        .then((tokens) => {
            if (!tokens) {
                return false;
            }

            for (let i = 0; i < tokens.length; i++) {
                contentContainer.appendChild(createObjktContainer(tokens[i]));
            }

            enablePageUI();

            if (state.isLastPage) {
                document.getElementById('next-page').classList.add('disabled');
                document.getElementById('next-page-mobile').classList.add('disabled');
            } else {
                document.getElementById('next-page').classList.remove('disabled');
                document.getElementById('next-page-mobile').classList.remove('disabled');
            }

            if (state.pageSkips.length === 1) {
                document.getElementById('previous-page').classList.add('disabled');
                document.getElementById('previous-page-mobile').classList.add('disabled');
            } else {
                document.getElementById('previous-page').classList.remove('disabled');
                document.getElementById('previous-page-mobile').classList.remove('disabled');
            }
        })
        .then(console.log, console.log);
    }

    function enableSyncUI() {
        document.getElementById('sync').innerText = 'unsync';
        document.getElementById('wallet-nav').classList.remove('hidden');
    }

    function disableSyncUI() {
        document.getElementById('sync').innerText = 'sync';
        document.getElementById('wallet-nav').classList.add('hidden');
    }

    function enablePageUI() {
        document.getElementById('next-page-controls').classList.remove('hidden');
        document.getElementById('page-control-nav').classList.remove('hidden');
    }

    function disablePageUI() {
        document.getElementById('next-page-controls').classList.add('hidden');
        document.getElementById('page-control-nav').classList.add('hidden');
    }

    function renderGalleryList(objkt) {
        var galleryList = document.getElementById('gallery-link-container');

        galleryList.innerHTML = '';

        var galleryKeys = Object.keys(state.session.galleryMap);

        for (let i = 0; i < galleryKeys.length; i++) {
            var gallery = state.session.galleryMap[galleryKeys[i]];
            var el = document.createElement('div');

            el.classList.add('gallery-link-container');

            var containerKey = 'gallery-link-' + galleryKeys[i];

            el.setAttribute('id', containerKey);

            var removeLink = document.createElement('a');

            removeLink.classList.add('remove-gallery');
            removeLink.setAttribute('href', '#');
            removeLink.setAttribute('data-gallery-key', galleryKeys[i]);

            removeLink.innerText = '🗑️';

            removeLink.addEventListener('click', function() {
                delete state.session.galleryMap[galleryKeys[i]];

                storeSession();
                renderGalleryList();
            });

            var galleryLink = document.createElement('a');

            galleryLink.classList.add('gallery-link');
            galleryLink.setAttribute('href', '#');
            galleryLink.setAttribute('data-gallery-key', galleryKeys[i]);

            galleryLink.innerText = gallery.displayName;

            galleryLink.addEventListener('click', function() {
                window.location.href = window.location.href.split('#')[0].split('?')[0] + '?tz=' + state.wallet.address + '&gallery=' + encodeURIComponent(JSON.stringify(state.session.galleryMap[galleryKeys[i]]));
            });

            if (!objkt) {
                el.appendChild(removeLink);
            } else {
                var gallerySettings = state.session.galleryMap[galleryKeys[i]];
                var issuer = objkt.issuer.platform.toLowerCase();
                var galleryIndex = gallerySettings[issuer].indexOf(objkt.identifier);

                if (galleryIndex !== -1) {
                    var removeFromGalleryLink = document.createElement('a');

                    removeFromGalleryLink.classList.add('remove-from-gallery');
                    removeFromGalleryLink.setAttribute('href', '#');
                    removeFromGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
        
                    removeFromGalleryLink.innerText = '⭕';
        
                    removeFromGalleryLink.addEventListener('click', function(evt) {
                        state.session.galleryMap[galleryKeys[i]][issuer].splice(galleryIndex, 1);
                        storeSession();
                        renderGalleryList(objkt);
                        evt.preventDefault();
                    });
        
                    el.appendChild(removeFromGalleryLink);
                } else {
                    var addToGalleryLink = document.createElement('a');

                    addToGalleryLink.classList.add('remove-from-gallery');
                    addToGalleryLink.setAttribute('href', '#');
                    addToGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
        
                    addToGalleryLink.innerText = '✅';
        
                    addToGalleryLink.addEventListener('click', function(evt) {
                        state.session.galleryMap[galleryKeys[i]][issuer].push(objkt.identifier);
                        storeSession();
                        renderGalleryList(objkt);
                        document.getElementById('gallery-list-container').classList.add('hidden');
                        evt.preventDefault();
                    });

                    el.appendChild(addToGalleryLink);
                }
            }

            el.appendChild(galleryLink);
            galleryList.appendChild(el);
        }
    }

    function storeSession() {
        sessionStore[state.wallet.address || 'default'] = state.session;
        console.log('storing session', sessionStore)
        window.localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(sessionStore));
    }
})();