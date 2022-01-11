(function () {
    var DEFAULT_PER_PAGE = 10;
    var DEFAULT_VIEWER_BG_COLOR = 'black';
    var SESSION_KEY = 'objktiv-session';
    var DEFAULT_BG_COLOR_OPTIONS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'];

    var session = window.localStorage.getItem(SESSION_KEY);

    if (!session) {
        var defaultSession = {
            nightModeActive: false,
            itemsPerPage: DEFAULT_PER_PAGE
        };

        window.localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));

        session = defaultSession;
    } else {
        session = JSON.parse(session);

        if (session.nightModeActive) {
            document.body.classList.add('night');
        }
    
        if (session.itemsPerPage) {
            document.getElementById('items-per-page').innerText = session.itemsPerPage;
        } else {
            session.itemsPerPage = DEFAULT_PER_PAGE;
        }
    }

    var BeaconWallet = beacon.DAppClient;
    var state = {
        wallet: null,
        isSyncingWallet: true, // must be set to false by event handlers below for sync button to enable
        itemsPerPage: session.itemsPerPage,
        page: 0
    };

    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    attachHandlers(); 

    if (params.tz) {
        state.wallet = {address: params.tz};

        populateCollection().then(console.log, console.log);
        document.getElementById('header-cta').classList.remove('hidden');
        document.getElementById('next-page-controls').classList.remove('hidden');
        document.getElementById('page-control-nav').classList.remove('hidden');
        document.getElementById('sync').classList.add('hidden');
    } else if (params.ipfs) {
        if (params.title) {
            console.log(params.title)
            document.title = params.title;
            document.getElementById('objkt-name').innerHTML = params.title;
        }

        if (params.issuer) {
            document.getElementById('objkt-name').innerHTML = document.getElementById('objkt-name').innerHTML + '<br id="objkt-title-break">by ' + params.issuer;
        }

        const selectedColor = session.viewerBgColor || DEFAULT_VIEWER_BG_COLOR;

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

        var client = new XMLHttpRequest();
        var url = params.ipfs;

        client.open("HEAD", url, true);
        client.send();

        client.onreadystatechange = function() {
            if(this.readyState == this.HEADERS_RECEIVED) {
                var contentType = client.getResponseHeader('content-type');
                console.log(contentType)
                const elementMap = {
                    image: function() {
                        return '<div id="image-resource" style="background-image: url(' + url + ')"></div>';
                    },
                    video: function() {
                        return '<video id="video-resource" autoplay loop controls muted><source src="' + url + '" type="' + contentType + '"></video>';
                    },
                    iframe: function() {
                        return '<iframe id="interactive-resource" src="' + url + '"/>';
                    }
                };

                var type = contentType.split('/')[0];

                document.getElementById('viewer-window-content').innerHTML = (elementMap[type] || elementMap.iframe)();
            }
        }

        return true;
    } else {
        var wallet = new BeaconWallet({
            name: 'OBJKTIV',
            eventHandlers: {
                ACTIVE_ACCOUNT_SET: {
                    handler: function (account) {
                        return new Promise(function(resolve, reject) {
                            state.isSyncingWallet = false;
    
                            if (account && account.address) {
                                state.wallet = account;
                                // removeClass(document.getElementById('hidden-nav'), 'hidden');
                                document.getElementById('sync').innerText = 'unsync';
                                document.getElementById('next-page-controls').classList.remove('hidden');
                                document.getElementById('page-control-nav').classList.remove('hidden');

                                return  populateCollection().then(resolve, reject);
                            }
    
                            resolve();
                        }).then(console.log, console.log);
                    }
                }
            }
        });
    }

    // function randEmoji() {
    //   var emoji = ['🌴', '🍕', '🎙️', '❤️', '🔥', '🔈','📻','🎵','🎶'];

    //   return emoji[Math.floor(Math.random() * emoji.length)]
    // }

    function addViewerBackgroundColorOption(newColor) {
        const colorMenu = document.getElementById('bg-color-picker-menu');
        const colorOption = document.createElement('div');

        colorOption.style.background = newColor;

        colorOption.classList.add('color-option');
        colorOption.setAttribute('data-color', newColor);
        colorOption.addEventListener('click', function() {
            session.viewerBgColor = newColor;
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            document.getElementById('viewer-window-content').style.background = newColor;
            document.getElementById('selected-bg-color').style.background = newColor;

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

        document.getElementById('hex-color-picker-submit').addEventListener('click', function() {
            let newColor = document.getElementById('hex-color-picker').textContent;

            newColor = newColor.replace('#', '');
        
            if (newColor.length === 3 || newColor.length === 6) {
                session.viewerBgColor = '#' + newColor;
                document.getElementById('selected-bg-color').style.background = '#' + newColor;
                document.getElementById('viewer-window-content').style.background = '#' + newColor;

                window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                addViewerBackgroundColorOption('#' + newColor);
            }


            closeColorPickerMenu();
        });

        document.getElementById("wallet-lookup-input").addEventListener("input", function() {
            const text = document.getElementById("wallet-lookup-input").innerText;

            document.getElementById("wallet-lookup-input").innerHTML = '';
            document.getElementById("wallet-lookup-input").innerText = '';
            document.getElementById("wallet-lookup-input").innerText = text.replace('\n', '');
        }, false);

        document.getElementById('wallet-lookup-submit').addEventListener('click', function() {
            var tzAddress = document.getElementById('wallet-lookup-input').textContent;

            if (tzAddress) {
                window.location.href = window.location.href.split('?')[0].replace('#', '') + '?tz=' + tzAddress;
            }
        });

        document.getElementById('exit-anon').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = window.location.href.split('?')[0];
        });

        document.getElementById('day-night-toggle').addEventListener('click', function (e) {
            if ((document.body.getAttribute('class') || '').indexOf('night') === -1) {
                document.body.classList.add('night');
                session.nightModeActive = true;
            } else {
                document.body.classList.remove('night');
                session.nightModeActive = false;
            }

            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            e.preventDefault();

            return false;
        });

        document.getElementById('sync').addEventListener('click', function (e) {
            if (!state.wallet && !state.isSyncingWallet) {
                state.isSyncingWallet = true;

                wallet.requestPermissions()
                    .then(function () {
                        return wallet.getPKH();
                    })
                    .then(function (address) {
                        state.wallet = address;
                        state.isSyncingWallet = false;

                        e.target.innerText = 'unsync';

                        return populateCollection();
                    })
                    .catch(console.log);
            } else if (state.wallet && !state.isSyncingWallet) {
                state.isSyncingWallet = true;

                wallet.removeAllAccounts()
                .then(function() {
                    state.wallet = null;
                    state.isSyncingWallet = false;
                    e.target.innerText = 'sync';

                    document.getElementById('main-content').innerHTML = '';
                    // addClass(document.getElementById('hidden-nav'), 'hidden');
                }).catch(console.log);
            }
        });

        document.getElementById('increase-items-per-page').addEventListener('click', function (e) {
            modifyItemsPerPage(1);
        });

        document.getElementById('decrease-items-per-page').addEventListener('click', function (e) {
            modifyItemsPerPage(0);
        });

        document.getElementById('next-page').addEventListener('click', function() {
            console.log('page', state.page);
            // TODO check totals
            state.page = state.page + 1;

            populateCollection();
        });

        document.getElementById('previous-page').addEventListener('click', function() {
            if (state.page === 0) {
                return false;
            }

            state.page -= 1;

            populateCollection();
        });
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
            var uri = window.location.href.split('?')[0].replace('#', '')
                + '?ipfs=' + encodeURIComponent(objkt.gatewayUri)
                + '&title=' + encodeURIComponent(objkt.name)
                + '&issuer=' + encodeURIComponent(objkt.issuer.handle);

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

        ipfsLink.innerText = '🛰️ ' + objkt.ipfsLink.substr(0, 20) + '...';

        const gatewayLink = document.createElement('a');

        gatewayLink.classList.add('gateway-link');

        gatewayLink.setAttribute('href', objkt.gatewayUri);
        gatewayLink.setAttribute('target', 'blank');

        gatewayLink.innerText = '🌀 ' + objkt.gatewayUri.substr(0, 30) + '...';

        const objktComLink = document.createElement('a');

        objktComLink.classList.add('objkt-com-link');
        objktComLink.setAttribute('target', 'blank');

        objktComLink.setAttribute('href', objkt.objktComLink);

        objktComLink.innerText = '🏪 ' + objkt.objktComLink.substr(0, 30) + '...';

        metadata.appendChild(title);
        metadata.appendChild(artist);
        metadata.appendChild(document.createElement('br'));
        metadata.appendChild(objktComLink);
        metadata.appendChild(gatewayLink);
        metadata.appendChild(ipfsLink);
        preview.appendChild(resource);
        container.appendChild(preview);
        container.appendChild(metadata);

        return container;  
    }

    // TODO you need to check marketplace totals and see if you even CAN get more given a page #
    function loadWalletTokens(address) {
        const skipCount = state.page ? state.page * state.itemsPerPage : 0;

        return Promise.all([
            fetch('https://hdapi.teztools.io/v1/graphql', {
                method: 'POST',
                body: JSON.stringify({
                    "query": "\nquery collectorGallery($address: String!) {\n  hic_et_nunc_token_holder(where: {holder_id: {_eq: $address}, token: {creator: {address: {_neq: $address}}}, quantity: {_gt: \"0\"}}, order_by: {token_id: desc}) {\n    token {\n      id\n      artifact_uri\n      display_uri\n      thumbnail_uri\n      timestamp\n      mime\n      title\n      description\n      supply\n      royalties\n      creator {\n        address\n        name\n      }\n    }\n  }\n}\n",
                    "variables": {
                        "address": address
                    },
                    "operationName": "collectorGallery"
                })
            }),
            fetch('https://api.fxhash.xyz/graphql', {
                method : "POST",
                headers: {
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                  },
                body: JSON.stringify({
                    "operationName": "Query",
                    "variables": {
                        "id": address,
                        "skip": skipCount,
                        "take": state.itemsPerPage
                    },
                    "query": "query Query($id: String!, $take: Int, $skip: Int) {\n  user(id: $id) {\n    id\n    objkts(take: $take, skip: $skip) {\n      id\n      assigned\n      iteration\n      owner {\n        id\n        name\n        flag\n        avatarUri\n        __typename\n      }\n      issuer {\n        name\n        flag\n        author {\n          id\n          name\n          flag\n          avatarUri\n          __typename\n        }\n        __typename\n      }\n      name\n      metadata\n      createdAt\n      offer {\n        id\n        price\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
                }),
            }),
        ])
        .then((responses) => Promise.all(responses.map(d => d.json())))
        .then(([hen, fxhash]) => {
            console.log(skipCount, state.itemsPerPage)
            return {
                hen: !hen
                    || !hen.data
                    || !hen.data.hic_et_nunc_token_holder
                    ? [] : hen.data.hic_et_nunc_token_holder.sort((a, b) => Date.now(b.token.timestamp) - Date.now(a.token.timestamp)).slice(skipCount ? skipCount - 1 : 0, skipCount + state.itemsPerPage).map((o) => ({
                    count: o.token.supply,
                    createdAt: o.token.timestamp,
                    description: o.token.description,
                    displayImgIpfsHash: o.token.display_uri.substr(7),
                    displayImgUri: 'https://ipfs.io/ipfs/' + o.token.display_uri.substr(7), 
                    // gatewayUri: (o.token.mime.split('/')[0] === 'video' ? 'https://ipfs.io/ipfs/' : 'https://ipfs.io/ipfs/') + o.token.artifact_uri.substr(7), 
                    gatewayUri: (o.token.mime.split('/')[0] === 'video' ? 'https://ipfs.io/ipfs/' : 'https://ipfs.io/ipfs/') + o.token.artifact_uri.substr(7), 
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
                })),
                fxhash: !fxhash
                    || !fxhash.data
                    || !fxhash.data.user
                    || !fxhash.data.user.objkts
                    ? [] : fxhash.data.user.objkts.map((o) => ({
                    count: null,
                    createdAt: o.createdAt,
                    description: o.metadata.description,
                    displayImgIpfsHash: o.metadata.displayUri.substr(7),
                    displayImgUri: 'https://ipfs.io/ipfs/' + o.metadata.displayUri.substr(7),
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
                }))
            };
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
            state.itemsPerPage = newOption;
            state.page = 0;
            document.getElementById('items-per-page').innerText = newOption;

            session.itemsPerPage = newOption;
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

            populateCollection();
        }
    }

    function populateCollection() {
        const contentContainer = document.getElementById('main-content');

        contentContainer.innerHTML = '';

        return loadWalletTokens(state.wallet.address)
        .then((collectionMap) => {
            return Object.values(collectionMap).reduce((acc, c) => acc.concat(c), []).sort(function (a, b) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        })
        .then((sortedCollection) => {
            if (!sortedCollection.length) {
                return true;
            }

            const selectedCollection = sortedCollection.slice(0, state.itemsPerPage);

            for (let i = 0; i < selectedCollection.length; i++) {
                contentContainer.appendChild(createObjktContainer(selectedCollection[i]));
            }
        })
        .then(console.log, console.log);
    }
})();