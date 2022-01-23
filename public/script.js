(function () {
    // Block TEA crypto algo https://www.movable-type.co.uk/scripts/tea-block.html
    !function(){function r(r,e){if(r=String(r),e=String(e),0==r.length)return"";var t=o(i(r)),u=o(i(e).slice(0,16)),c=n(t,u),d=f(c),h=a(d);return h}function e(r,e){if(r=String(r),e=String(e),0==r.length)return"";var n=o(c(r)),a=o(i(e).slice(0,16)),d=t(n,a),h=f(d),l=u(h.replace(/\0+$/,""));return l}function n(r,e){r.length<2&&(r[1]=0);for(var n,t,o=r.length,f=2654435769,i=Math.floor(6+52/o),u=r[o-1],a=r[0],c=0;i-->0;){c+=f,t=c>>>2&3;for(var d=0;o>d;d++)a=r[(d+1)%o],n=(u>>>5^a<<2)+(a>>>3^u<<4)^(c^a)+(e[3&d^t]^u),u=r[d]+=n}return r}function t(r,e){for(var n,t,o=r.length,f=2654435769,i=Math.floor(6+52/o),u=r[o-1],a=r[0],c=i*f;0!=c;){t=c>>>2&3;for(var d=o-1;d>=0;d--)u=r[d>0?d-1:o-1],n=(u>>>5^a<<2)+(a>>>3^u<<4)^(c^a)+(e[3&d^t]^u),a=r[d]-=n;c-=f}return r}function o(r){for(var e=new Array(Math.ceil(r.length/4)),n=0;n<e.length;n++)e[n]=r.charCodeAt(4*n)+(r.charCodeAt(4*n+1)<<8)+(r.charCodeAt(4*n+2)<<16)+(r.charCodeAt(4*n+3)<<24);return e}function f(r){for(var e="",n=0;n<r.length;n++)e+=String.fromCharCode(255&r[n],r[n]>>>8&255,r[n]>>>16&255,r[n]>>>24&255);return e}function i(r){return unescape(encodeURIComponent(r))}function u(r){try{return decodeURIComponent(escape(r))}catch(e){return r}}function a(r){if("undefined"!=typeof btoa)return btoa(r);if("undefined"!=typeof Buffer)return new Buffer(r,"binary").toString("base64");throw new Error("No Base64 Encode")}function c(r){if("undefined"==typeof atob&&"undefined"==typeof Buffer)throw new Error("No base64 decode");try{if("undefined"!=typeof atob)return atob(r);if("undefined"!=typeof Buffer)return new Buffer(r,"base64").toString("binary")}catch(e){throw new Error("Invalid ciphertext")}}window.BlockTEACrypto={encrypt:r,decrypt:e}}();

    var BLOCK_TEA_PASSPHRASE = 'abc123';
    var BlockTEACrypto = window.BlockTEACrypto;
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
            objktcom: 0
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

    function closePopUp() {
        document.getElementById('pop-up-container').classList.add('hidden');
        document.getElementById('gallery-link-content').classList.add('hidden');
        document.getElementById('settings-content-container').classList.add('hidden');
    }

    function attachHandlers() {
        document.addEventListener('keydown', function(evt) {
            if (evt.code && evt.code === 'Escape' || evt.keyCode && evt.keyCode === 27) {
                document.getElementById('sidebar').classList.add('hidden');
                closePopUp();
            }        
        });

        var sidebarLinks = document.getElementsByClassName('sidebar-link');

        for (var i = 0; i < sidebarLinks.length; i++) {
            sidebarLinks[i].addEventListener('click', function() {
                document.getElementById('sidebar').classList.add('hidden');
            }, false);
        }

        document.getElementById('sidebar-toggle').addEventListener('click', function() {
            var sidebar = document.getElementById('sidebar');
            var classArr = Array.prototype.slice.call(sidebar.classList);

            if (classArr.indexOf('hidden') === -1) {
                sidebar.classList.add('hidden');
            } else {
                sidebar.classList.remove('hidden');
            }
        });

        document.getElementById('title').addEventListener('click', function() {
            window.location.href = window.location.href.split('#')[0].split('?')[0];
        });

        document.getElementById('galleries-link').addEventListener('click', function(evt) {
            openGalleryMenu();
            evt.preventDefault();
        });

        document.getElementById('settings-link').addEventListener('click', function(evt) {
            openSettingsMenu();
            evt.preventDefault();
        });

        document.getElementById('settings-import-submit').addEventListener('click', function(evt) {
            if (Array.prototype.slice.call(evt.target.classList).indexOf('disabled') !== -1) {
                return false;
            }

            var possibleJSON = document.getElementById('settings-import-input').innerText;
            var settings;

            document.getElementById("settings-import-input").innerText = '';

            try {
                settings = BlockTEACrypto.decrypt(possibleJSON, BLOCK_TEA_PASSPHRASE);
                settings = JSON.parse(settings);

                if (typeof settings !== 'object' || Array.isArray(settings)) {
                    throw('Settings not an object');
                }
            } catch (err) {
                console.log('Settings import input not valid settings', err);

                settings = null;
            }

            if (settings) {
                state.session = settings;

                storeSession();
                applySessionPreferences();
            }
        });

        document.getElementById('settings-export-submit').addEventListener('click', function() {
            document.getElementById('settings-export-text').focus();
            copyToClipboard(document.getElementById('settings-export-text').innerText);


            function copyToClipboard(input) {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(input).then(() => {
                    alert('Settings copied to clipboard');
                  }, (err) => {
                    alert('Failed to copy settings - Copy settings manually');
                  });
                } else if (window.clipboardData) {
                  window.clipboardData.setData("Text", input);
                }
              }
        });

        document.getElementById('pop-up-exit').addEventListener('click', closePopUp);
        document.getElementById('pop-up-exit-overlay').addEventListener('click', closePopUp);

        var newGallerySubmitHandler = function(evt) {
            var newGalleryName = document.getElementById('new-gallery-input').textContent;

            if (newGalleryName) {
                document.getElementById('new-gallery-input').textContent = '';
                state.session.galleryMap[state.session.galleryIndex] = {
                    displayName: newGalleryName,
                    hic: [],
                    fxhash: [],
                    objktcom: [],
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

        document.getElementById("settings-import-input").addEventListener("input", function() {
            const text = document.getElementById("settings-import-input").innerText;

            document.getElementById("settings-import-input").innerHTML = '';
            document.getElementById("settings-import-input").innerText = '';
            document.getElementById("settings-import-input").innerText = text.replace('\n', '');

            var settingsInput = document.getElementById('settings-import-submit');

            console.log(text);
            if (text) {
                settingsInput.classList.remove('disabled');
            } else {
                settingsInput.classList.add('disabled');
            }
        }, false);

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

        var toggleNightMode = function (e) {
            if ((document.body.getAttribute('class') || '').indexOf('night') === -1) {
                setNightMode(true);
            } else {
                setNightMode(false);
            }

            e.preventDefault();

            return false;
        };

        document.getElementById('day-night-toggle').addEventListener('click', toggleNightMode);
        // document.getElementById('day-night-toggle-mobile').addEventListener('click', toggleNightMode);

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

        // const resource = document.createElement('div');

        // resource.style.backgroundImage = 'url(' + objkt.displayImgUri + ')';
        // resource.classList.add('resource');

        const metadata = document.createElement('div');

        metadata.classList.add('objkt-metadata');

        const artist = document.createElement('a');

        artist.classList.add('artist');
        artist.setAttribute('href', objkt.platformIssuerUri);
        artist.setAttribute('target', 'blank');

        artist.innerText = objkt.issuer.handle;

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

        var img = document.createElement('img');

        img.classList.add('preview-img');
        img.setAttribute('src', objkt.displayImgUri);

        metadata.appendChild(title);
        metadata.appendChild(document.createElement('br'));
        metadata.appendChild(artist);
        // metadata.appendChild(document.createElement('br'));
        // metadata.appendChild(document.createElement('br'));
        // metadata.appendChild(objktComLink);
        // metadata.appendChild(gatewayLink);
        // metadata.appendChild(ipfsLink);
        // preview.appendChild(resource);
        preview.appendChild(img);
        
        if (!state.wallet.anonymous) {
            // metadata.appendChild(objktGallerySettings);
        }
    
        container.appendChild(preview);
        container.appendChild(metadata);

        var wrapper = document.createElement('div');

        wrapper.classList.add('objkt-outer-wrapper');

        var table = document.createElement('div');

        table.classList.add('objkt-wrapper-table');

        var tableCell = document.createElement('div');

        tableCell.classList.add('objkt-wrapper-table-cell');

        tableCell.appendChild(container);
        table.appendChild(tableCell);
        wrapper.appendChild(table);

        wrapper.classList.add('placeholder-aspect');
        img.onload = function () {
            wrapper.classList.remove('placeholder-aspect');
            console.log(img.naturalHeight, img.naturalWidth)

            if (img.naturalHeight === img.naturalWidth) {
                preview.classList.add('square-aspect');
                container.classList.add('square-aspect');
                wrapper.classList.add('square-aspect');
            } else if (img.naturalHeight < img.naturalWidth) {
                if (img.naturalWidth - (img.naturalWidth - img.naturalHeight) >= img.naturalWidth * .9) {
                    preview.classList.add('square-aspect');
                    container.classList.add('square-aspect');
                    wrapper.classList.add('square-aspect');
                } else {
                    preview.classList.add('landscape-aspect');
                    container.classList.add('landscape-aspect');
                    wrapper.classList.add('landscape-aspect');
                }
            } else {
                preview.classList.add('portrait-aspect');
                container.classList.add('portrait-aspect');
                wrapper.classList.add('portrait-aspect');
            }
        };

        return wrapper;  
    }

    function loadHicTokens(address, galleryMap, perPage) {
        var idList = galleryMap && galleryMap.hic;
        var constraint = '';
        var shouldQuery = true;

        if (Array.isArray(idList) && idList.length) {
            /**
             * The hic indexer allows us to query by ID + wallet holder, so we can search for gallery objkts directly.
             */
            constraint = ', _or: [';

            for (let i = 0; i < idList.length; i++) {
                constraint += '{token_id: {_eq: ' + idList[i] + '}}';

                if (i < idList.length -1) {
                    constraint += ',';
                }
            }

            constraint += ']';
        } else if (Array.isArray(idList)) {
            shouldQuery = false;
        }

        return !shouldQuery ? Promise.resolve(null) : fetch('https://hdapi.teztools.io/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: "\nquery collectorGallery($address: String!) {\n  hic_et_nunc_token_holder(limit: " + perPage + ", offset: " + state.skipCounts.hic + ", where: {holder_id: {_eq: $address}, token: {creator: {address: {_neq: $address}}}, quantity: {_gt: \"0\"} " + constraint + "}, order_by: {token_id: desc}) {\n    token {\n      id\n      artifact_uri\n      display_uri\n      thumbnail_uri\n      timestamp\n      mime\n      title\n      description\n      supply\n      royalties\n      creator {\n        address\n        name\n      }\n    }\n  }\n}\n",
                variables: {
                    address: address,
                },
                operationName: 'collectorGallery'
            })
        });
    }

    function loadFxhashTokens(address, galleryMap, perPage) {
        var idList = galleryMap && galleryMap.fxhash;
        var constraint = '(take: ' + perPage + ', skip: ' + state.skipCounts.fxhash + ')';
        var shouldQuery = true;

        if (Array.isArray(idList) && idList.length) {
            /**
             * The fxhash indexer does not have pagination, and querying by objkt id and retrieving
             * owners, so if we are looking for specific objkts (for gallery) we need the entire list.
             */

            constraint = '';
        } else if (Array.isArray(idList)) {
            shouldQuery = false;
        }

        return !shouldQuery ? Promise.resolve(null) : fetch('https://api.fxhash.xyz/graphql', {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "operationName": "Query",
                "variables": {
                    "id": address,
                },
                "query": "query Query($id: String!) {\n  user(id: $id) {\n    id\n    objkts" + constraint + " {\n      id\n      assigned\n      iteration\n      owner {\n        id\n        name\n        flag\n        avatarUri\n        __typename\n      }\n      issuer {\n        name\n        flag\n        author {\n          id\n          name\n          flag\n          avatarUri\n          __typename\n        }\n        __typename\n      }\n      name\n      metadata\n      createdAt\n      offer {\n        id\n        price\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
            }),
        });
    }

    function loadObjktComTokens(address, galleryMap, perPage) {
        var idList = galleryMap && galleryMap.objktcom;
        var skipConstraint = 'limit: ' + perPage + ', offset: ' +  state.skipCounts.objktcom + ',';
        var shouldQuery = true;
        var idConstraint = '';

        if (Array.isArray(idList) && idList.length) {
            var idArr = idList.map((meta) => {
                var seg = meta.split('|');

                return '{token: {id: {_eq: "' + seg[0] + '"}, fa2: {contract: {_eq: "' + seg[1] + '"}}}}';
            });

            idConstraint = '{_or: [' + idArr.join(',') + ']},';

        } else if (Array.isArray(idList)) {
            shouldQuery = false;
        }

        return !shouldQuery ? Promise.resolve(null) : fetch('https://data.objkt.com/v1/graphql', {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: 'query GetObjktComTokens {token(order_by: {timestamp: desc},' + skipConstraint + ' where: {token_holders: {quantity: {_gt: 0}, holder: {address: {_eq: "' + address + '"}}, _and: [' + idConstraint + '{token: {fa2: {contract: {_neq: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"}}}}, {token: {fa2: {contract: {_neq: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE"}}}}]}}) {id,fa2 {,contract,collection_id},timestamp,title,creator {,address,alias},mime,description,display_uri,artifact_uri,thumbnail_uri}}'
            }),
        });
    }

    // TODO you need to check marketplace totals and see if you even CAN get more given a page #
    function loadWalletTokens(address, galleryMap) {
        console.log(galleryMap)
        // TODO skip count per smart contractperPage
        // var skipCount = state.page ? state.page * state.itemsPerPage : 0;
        var perPage = Math.floor(state.itemsPerPage * 1.5);
        var promises = [];
    
        promises.push(loadHicTokens(address, galleryMap, perPage));
        promises.push(loadFxhashTokens(address, galleryMap, perPage));
        promises.push(loadObjktComTokens(address, galleryMap, perPage));

        return Promise.all(promises)
        .then((res) => Promise.all(res.map((d) => !d ? d : d.json())))
        .then(([hic, fxhash, objktcom]) => {
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
                    var fxhashIdList = galleryMap && galleryMap.fxhash;

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
                objktcom: !objktcom
                || !objktcom.data
                || !objktcom.data.token
                ? [] : objktcom.data.token.map((o) => {
                    var mimeBase = o.mime.split('/')[0];

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
                        count: null,
                        createdAt: o.timestamp,
                        description: o.description,
                        displayImgIpfsHash: o.display_uri.substr(7),
                        displayImgUri: 'https://cloudflare-ipfs.com/ipfs/' + o.display_uri.substr(7),
                        gatewayUri: 'https://gateway.fxhash.xyz/ipfs/' + o.artifact_uri.substr(7), 
                        identifier: o.id + '|' + o.fa2.contract,
                        ipfsLink: o.artifact_uri,
                        issuer: {
                            address: o.creator.address,
                            avatarIpfsHash: null,
                            handle: o.creator.alias || truncateAddress(o.creator.address),
                            platform: 'OBJKTCOM',
                        },
                        name: o.title,
                        objktComLink: 'https://objkt.com/asset/' + o.fa2.contract + '/' + o.id,
                        platformUri: 'https://objkt.com/asset/' + o.fa2.contract + '/' + o.id,
                        platformIssuerUri: 'https://objkt.com/profile/' + o.creator.address + '/created',
                        resourceIpfsHash: o.artifact_uri.substr(7),
                        type: tokenType,
                    };
                }),
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
        document.getElementById('pop-up-container').classList.remove('hidden');
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

    function setPopUpHeaderContent(str) {
        document.getElementById('pop-up-header-content').innerText = str;
    }

    function openSettingsMenu() {
        document.getElementById('pop-up-container').classList.remove('hidden');

        var settingsContainer = document.getElementById('settings-content-container');

        console.log('session', state.session)
        document.getElementById('settings-export-text').innerText = BlockTEACrypto.encrypt(JSON.stringify(state.session), BLOCK_TEA_PASSPHRASE);
        setPopUpHeaderContent('Your Settings');
        // renderSettingsMenu();
        settingsContainer.classList.remove('hidden');
    }

    // function renderSettingsMenu() {
    //     // var settingsContent = document.getElementById('settings-content-container');
    //     // var settings = {
    //     //     import: {
    //     //         html: '',
    //     //         handler: function() {

    //     //         },
    //     //     },
    //     // };


    // }

    function renderGalleryList(objkt) {
        if (objkt) {
            setPopUpHeaderContent('Gallery Membership');
            document.getElementById('new-gallery-input').classList.add('hidden');
            document.getElementById('new-gallery-submit').classList.add('hidden');
        } else {
            setPopUpHeaderContent('Manage Galleries');
            document.getElementById('new-gallery-input').classList.remove('hidden');
            document.getElementById('new-gallery-submit').classList.remove('hidden');
        }

        var galleryList = document.getElementById('gallery-link-container');

        document.getElementById('gallery-link-content').classList.remove('hidden');

        galleryList.innerHTML = '';

        var galleryKeys = Object.keys(state.session.galleryMap);
        console.log(state.session.galleryMap)
        galleryKeys = galleryKeys.sort(function (a, b) {
            return state.session.galleryMap[a].displayName.charCodeAt(0) - state.session.galleryMap[b].displayName.charCodeAt(0);
        });

        for (let i = 0; i < galleryKeys.length; i++) {
            var gallery = state.session.galleryMap[galleryKeys[i]];
            var el = document.createElement('div');

            el.classList.add('gallery-link-wrapper')

            var containerKey = 'gallery-link-' + galleryKeys[i];

            el.setAttribute('id', containerKey);

            var removeLink = document.createElement('a');

            removeLink.classList.add('remove-gallery');
            removeLink.setAttribute('href', '#');
            removeLink.setAttribute('data-gallery-key', galleryKeys[i]);

            removeLink.innerText = '[DEL]';

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

                gallerySettings[issuer] = gallerySettings[issuer] || [];

                var galleryIndex = gallerySettings[issuer].indexOf(objkt.identifier);

                if (galleryIndex !== -1) {
                    var removeFromGalleryLink = document.createElement('a');

                    removeFromGalleryLink.classList.add('remove-from-gallery');
                    removeFromGalleryLink.setAttribute('href', '#');
                    removeFromGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
        
                    removeFromGalleryLink.innerText = '[RMV]';
        
                    removeFromGalleryLink.addEventListener('click', function(evt) {
                        state.session.galleryMap[galleryKeys[i]][issuer].splice(galleryIndex, 1);
                        storeSession();
                        renderGalleryList(objkt);
                        evt.preventDefault();
                    });
        
                    el.appendChild(removeFromGalleryLink);
                } else {
                    var addToGalleryLink = document.createElement('a');

                    addToGalleryLink.classList.add('add-to-gallery');
                    addToGalleryLink.setAttribute('href', '#');
                    addToGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
        
                    addToGalleryLink.innerText = '[ADD]';
        
                    addToGalleryLink.addEventListener('click', function(evt) {
                        state.session.galleryMap[galleryKeys[i]][issuer].push(objkt.identifier);
                        storeSession();
                        renderGalleryList(objkt);
                        document.getElementById('pop-up-container').classList.add('hidden');
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