// GalleryPopUp Class
(function () {
    var PopUp = window.PopUp;

    function GalleryPopUp(state, popUpElement) {
        Util.addSuper(this, PopUp);

        PopUp.call(this, state, popUpElement, 'Gallery Membership', 'gallery-settings-container');
    }

    GalleryPopUp.prototype = Object.create(PopUp.prototype);

    GalleryPopUp.prototype._addEventHandlers = function () {
        var self = this;

        this._state.eventEmitter.on(Util.eventKeys.DISPATCH_POP_UP_GALLERY_OPEN, function (objkt) {
            self.open(objkt);
        });

        this._state.eventEmitter.on(Util.eventKeys.GALLERY_CREATE, function () {
            if (self._isOpen) {
                self._renderGalleryList();
            }
        });

        this._state.eventEmitter.on(Util.eventKeys.SESSION_SAVE, function () {
            if (self._isOpen) {
                self._renderGalleryList();
            }
        });
    };

    GalleryPopUp.prototype._attachGestureHandlers = function () {};

    GalleryPopUp.prototype._renderGalleryList = function () {
        document.getElementById('gallery-management-tooltip').innerHTML = 'Modify gallery membership<br>for the following token:<br><br><span>' + Util.truncateString(this._objkt.name, 50) + '</span>';

        var galleryKeys = Object.keys(this._state.session.galleryMap);

        if (!galleryKeys.length) {
            return false;
        }

        document.getElementById('no-gallery-message') && document.getElementById('no-gallery-message').classList.add('hidden');

        var galleryList = document.getElementById('gallery-settings-content');

        galleryList.innerHTML = '';

        var galleryKeys = Object.keys(this._state.session.galleryMap);
        var self = this;

        galleryKeys = galleryKeys.sort(function (a, b) {
            return self._state.session.galleryMap[a].displayName.charCodeAt(0) - self._state.session.galleryMap[b].displayName.charCodeAt(0);
        });

        for (var i = 0; i < galleryKeys.length; i++) {
            var gallery = this._state.session.galleryMap[galleryKeys[i]];
            var el = document.createElement('div');

            el.classList.add('gallery-settings-wrapper')

            var containerKey = 'gallery-settings-' + galleryKeys[i];

            el.setAttribute('id', containerKey);

            var galleryTitle = document.createElement('a');

            galleryTitle.classList.add('gallery-link');

            galleryTitle.innerText = gallery.displayName;

            // (function (galleryTitle, window, self, i) {
            //     galleryTitle.addEventListener('click', function() {
            //         window.location.href = Util.getHost() + '?view=collection&tz=' + self._state.wallet.getActiveAccount().address + '&gallery=' + encodeURIComponent(JSON.stringify(self._state.session.galleryMap[galleryKeys[i]]));
            //     });    
            // })(galleryTitle, window, self, i);

            var galleryMetadata = this._state.session.galleryMap[galleryKeys[i]];
            var tokenIndex = galleryMetadata.tokens.indexOf(this._objkt.tid);

            if (tokenIndex !== -1) {
                var removeFromGalleryLink = document.createElement('a');

                removeFromGalleryLink.classList.add('remove-from-gallery');
                removeFromGalleryLink.setAttribute('href', '#');
                removeFromGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
    
                removeFromGalleryLink.innerText = '[RMV]';

                (function (removeFromGalleryLink, self, i) {
                    removeFromGalleryLink.addEventListener('click', function(evt) {
                        self._state.session.galleryMap[galleryKeys[i]].tokens.splice(tokenIndex, 1);
                        self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, self._state.wallet.getActiveAccount().address, self._state.session);
                        evt.preventDefault();
                    });
                })(removeFromGalleryLink, self, i);

                el.appendChild(removeFromGalleryLink);
            } else {
                var addToGalleryLink = document.createElement('a');

                addToGalleryLink.classList.add('add-to-gallery');
                addToGalleryLink.setAttribute('href', '#');
                addToGalleryLink.setAttribute('data-gallery-key', galleryKeys[i]);
    
                addToGalleryLink.innerText = '[ADD]';
    
                (function (addToGalleryLink, self, i) {
                    addToGalleryLink.addEventListener('click', function(evt) {
                        self._state.session.galleryMap[galleryKeys[i]].tokens = self._state.session.galleryMap[galleryKeys[i]].tokens || [];

                        self._state.session.galleryMap[galleryKeys[i]].tokens.push(self._objkt.tid);
                        self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, self._state.wallet.getActiveAccount().address, self._state.session);
                        evt.preventDefault();
                    });
                })(addToGalleryLink, self, i);

                el.appendChild(addToGalleryLink);
            }

            el.appendChild(galleryTitle);
            galleryList.appendChild(el);
        }
    };

    GalleryPopUp.prototype.close = function () {
        this._super.close.call(this._super);

        this._objkt = null;
        this._isOpen = false;
    };

    GalleryPopUp.prototype.open = function (objkt) {
        this._isOpen = true;
        this._objkt = objkt;

        this._renderGalleryList();
        this._super.open.call(this._super);
    };

    window.GalleryPopUp = GalleryPopUp;
})();

// CollectionView Class
(function() {
    var View = window.View;
    var Util = window.Util;
    var PopUpElement = window.PopUpElement;
    var GalleryPopUp = window.GalleryPopUp;

    /**
     * CollectionView is used to show a set of works belonging to a wallet.
     * This could be an anonymous wallet, a gallery, a sync'd wallet's collection.
     */

    function CollectionView(state) {
        Util.addSuper(this, View);
        View.call(this, state);

        new GalleryPopUp(state, new PopUpElement(state));

        document.getElementById('collection-view').classList.remove('hidden');
    }

    CollectionView.prototype = Object.create(View.prototype);

    /**
     * Apply CollectionView specific wallet preferences.
     */

    CollectionView.prototype._applySessionPreferences = function() {
        this._super._applySessionPreferences();

        // Apply user's items-per-page-preference.
        document.getElementById('items-per-page').innerText = this._state.session.itemsPerPage;

        document.getElementById('view-style-text').innerText = this._state.view.metadata.collectionStyle.charAt(0).toUpperCase()
            + this._state.view.metadata.collectionStyle.split('').slice(1).join('');
    };

    CollectionView.prototype._addEventHandlers = function () {
        this._super._addEventHandlers();

        var self = this;

        this._state.eventEmitter.on(Util.eventKeys.UPDATE_ITEMS_PER_PAGE, function () {
            // self._state.view.metadata.pagination.pageSkips = [];

            // self._resetSkipCounts();
            self._renderCollection();
        });
    };

    CollectionView.prototype._attachGestureHandlers = function () {
        this._super._attachGestureHandlers();

        /**
         * Items per page controls
         */

        var getUpdatedPerPageCount = function (modifier, currentCount) {
            var countOptions = [10, 20, 30, 40, 50];
            var currentOption = countOptions.indexOf(currentCount);
            var shouldIncrease = modifier && currentOption !== countOptions.length - 1;
            var shouldDecrease = !modifier && currentOption !== 0;
    
            if (shouldIncrease) {
                return countOptions[currentOption + 1];
            } else if (shouldDecrease) {
                return countOptions[currentOption - 1];
            } else {
                return null;
            }
        };

        var perPageTimeout;
        var newPerPageCount;
        var modifyItemsPerPage = (function (mod) {
            if (this._state.view.metadata.isLoadingCollection) {
                return false;
            }

            var count = getUpdatedPerPageCount(mod, newPerPageCount || this._state.session.itemsPerPage);

            if (!count) {
                return false;
            }

            perPageTimeout && clearTimeout(perPageTimeout);

            document.getElementById('items-per-page').innerText = newPerPageCount = count;

            perPageTimeout = setTimeout((function () {
                this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_UPDATE_ITEMS_PER_PAGE, newPerPageCount);

                newPerPageCount = null;
            }).bind(this), 500);
        }).bind(this);

        document.getElementById('increase-items-per-page').addEventListener('click', function () {
            modifyItemsPerPage(1);
        });

        document.getElementById('decrease-items-per-page').addEventListener('click', function () {
            modifyItemsPerPage(0);
        });

        var navigateNextPage = function(evt, options) {
            evt.preventDefault();

            // @TODO rework this so it's not looking at classes to determine disabled status
            if (Array.prototype.slice.call(evt.target.classList, 0).indexOf('disabled') !== -1) {
                return false;
            }

            var collectionOptions = options || {};
            var currentPage = this._state.view.metadata.page;

            collectionOptions.page = currentPage || currentPage === 0 ? currentPage + 1 : 0;

            /**
             * We want to avoid page reloads when switching collection pages bc this will force
             * the indexer to gather tokens for anonymous collections needlessly.
             */
            if (this._state.view.metadata.collectionStyle !== 'masonry' && !this._state.view.metadata.isAnonymousTargetAddress) {
                var params = Util.querystring(document.location.href).toObject();

                params.page = collectionOptions.page + 1;
    
                var url = Util.getHost() + Util.querystring(params).toString();

                // window.history.replaceState({}, '', url);
                window.history.pushState({}, '', url);
                window.onpopstate = function () {
                    var qs = Util.querystring(window.location.href).toObject();

                    this._state.view.metadata.page = collectionOptions.page = parseInt(qs.page) - 1;

                    this._renderCollection(collectionOptions);
                }.bind(this);
            }

            this._renderCollection(collectionOptions);
        };

        /**
         * Next/Previous page controls
         */

        document.getElementById('next-page').addEventListener('click', navigateNextPage.bind(this));
        document.getElementById('next-page-mobile').addEventListener('click', navigateNextPage.bind(this));

        var navigatePreviousPage = function(evt, options) {
            evt.preventDefault();

            if (Array.prototype.slice.call(evt.target.classList, 0).indexOf('disabled') !== -1) {
                evt.stopPropagation();
                evt.preventDefault();

                return false;
            }

            var collectionOptions = options || {};
            var currentPage = this._state.view.metadata.page;

            collectionOptions.page = currentPage > 0 ? currentPage - 1 : 0;

            /**
             * We want to avoid page reloads when switching collection pages bc this will force
             * the indexer to gather tokens for anonymous collections needlessly.
             */
             if (this._state.view.metadata.collectionStyle !== 'masonry') {
                var params = Util.querystring(document.location.href).toObject();

                params.page = collectionOptions.page + 1;
    
                var url = Util.getHost() + Util.querystring(params).toString();

                // window.history.replaceState({}, '', url);
                window.history.pushState({}, '', url);
                window.onpopstate = function () {
                    var qs = Util.querystring(window.location.href).toObject();

                    this._state.view.metadata.page = collectionOptions.page = parseInt(qs.page) - 1;

                    this._renderCollection(collectionOptions);
                }.bind(this);
            }

            this._renderCollection(collectionOptions);
        };

        document.getElementById('previous-page').addEventListener('click', navigatePreviousPage.bind(this));
        document.getElementById('previous-page-mobile').addEventListener('click', navigatePreviousPage.bind(this));
        document.getElementById('load-more').addEventListener('click', function (evt) {
            return navigateNextPage.call(this, evt, {retain: true});
        }.bind(this));

        var resizeTimeout;

        window.addEventListener('resize', (function () {
            if (Util.isMobile()) {
                return false;
            }

            resizeTimeout && clearTimeout(resizeTimeout);

            // document.getElementsByClassName('token-artifact-preview-wrapper') && Array.prototype.slice.call(document.getElementsByClassName('token-artifact-preview-wrapper'), 0).forEach(function (wrapper) {
            //     wrapper.style.width = 'auto';
            //     wrapper.style.height = 'auto';
            // });

            resizeTimeout = setTimeout(function () {
                document.getElementById('main-content-loading-screen').classList.add('hidden', 'transparent');

                document.getElementById('main-content').classList.remove('hidden');

                if (this._state.view.metadata.macy) {
                    this._state.view.metadata.macy.recalculate(true);
                }

                document.getElementById('main-content').classList.remove('transparent');
            }.bind(this), 500);

            document.getElementById('main-content').classList.add('hidden', 'transparent');
            document.getElementById('main-content-loading-screen').classList.remove('hidden', 'transparent');
        }).bind(this));

        /**
         * Wallet Lookup form
         */

        var walletLookupSubmitHandler = function() {
            var tzAddress = document.getElementById('wallet-lookup-input').textContent;

            if (tzAddress) {
                window.location.href = window.location.href.split('?')[0].replace('#', '') + '?view=collection&tz=' + tzAddress;
            }
        };

        document.getElementById("wallet-lookup-input").addEventListener('keypress', function(e) {
            if (e.code && e.code === 'Enter' || e.keyCode && e.keyCode === 13) {
                e.preventDefault();
    
                walletLookupSubmitHandler();
            }
        });

        document.getElementById('wallet-lookup-submit').addEventListener('click', walletLookupSubmitHandler);

        var opening = false;

        document.getElementById('view-style-nav').addEventListener('click', function (evt) {
            var navClassList = document.getElementById('view-style-options-container').classList;

            if (Array.prototype.slice.call(navClassList, 0).indexOf('hidden') !== -1) {
                document.getElementById('view-style-options-container').classList.remove('hidden');
                opening = true;
                setTimeout(function () {
                    opening = false;
                }, 0);
            }
        });

        document.addEventListener('click', function () {
            if (!opening) {
                document.getElementById('view-style-options-container').classList.add('hidden');
            }
        });

        var viewStyleOptions = Array.prototype.slice.call(document.getElementsByClassName('view-style-option'), 0);

        var viewStyles = ['grid', 'masonry'];

        for (var i = 0; i < viewStyleOptions.length; i++) {
            (function (viewStyleOption, i, viewStyles, querystrings) {
                viewStyleOption.addEventListener('click', function (evt) {
                    querystrings.collection_style = viewStyles[i];

                    window.location = Util.getHost() + Util.querystring(querystrings).toString();
                    document.getElementById('view-style-options-container').classList.add('hidden');
                    evt.stopPropagation();
                });
            })(viewStyleOptions[i], i, viewStyles, this._state.urlQuerystrings);
        }

        var debounce = false;

        // document.addEventListener('scroll', function () {
        //     // if (debounce || this._state.view.metadata.disableScrollHide === true) {
        //     //     return false;
        //     // }

        //     debounce = true;

        //     setTimeout(function () {
        //         debounce = false;
        //     }, 250);

        //     document.getElementsByClassName('token-artifact-preview-wrapper') && Array.prototype.slice.call(document.getElementsByClassName('token-artifact-preview-wrapper'), 0).forEach(function (wrapper) {
        //         var img;

        //         for (var i = 0; i < wrapper.childNodes.length; i++) {
        //             if (wrapper.childNodes[i].classList.contains('token-artifact-preview')) {
        //                 img = wrapper.childNodes[i];

        //                 break;
        //             }        
        //         }

        //         wrapper.offsetHeight && wrapper.getAttribute('data-macy-complete') === '1' && (wrapper.style.height = wrapper.offsetHeight + 'px');
        //         wrapper.offsetWidth && wrapper.getAttribute('data-macy-complete') === '1' && (wrapper.style.width = wrapper.offsetWidth + 'px');

        //         if (img) {
        //             if (!isElementInViewport(wrapper, 500)) {
        //                 img.classList.add('transparent');
        //             } else {
        //                 img.classList.remove('transparent');
        //             }
        //         }

        //         function isElementInViewport (el, limit) {
        //             var vHeight = window.innerHeight || document.documentElement.clientHeight;
        //             var rect = el.getBoundingClientRect();

        //             return (rect.bottom > limit * -1) && (rect.top < vHeight + limit);
        //         } 
        //     }.bind(this));
        // }.bind(this));
    };

    CollectionView.prototype._createTokenContainer = function (objkt) {
        var imgLink = document.createElement('a');

        // @TODO make img links and images siblings. This is preventing full sized image links before image preview load is complete.
        imgLink.classList.add('token-artifact-preview-wrapper');

        imgLink.href = Util.getHost() + Util.querystring({
            view: 'artifact',
            ipfs: this._state.session.defaultGateway + '/ipfs/' + objkt.ipfsLink.substring(7),
            title: objkt.name,
            mime: objkt.mime
        }).toString();

        imgLink.target = '_blank';

        var img = document.createElement('img');

        // img.classList.add('token-artifact-preview');

        // img.src = this._state.session.defaultGateway + '/ipfs/' + objkt.displayArtifactIpfsAddress.substring(7);

        var loadImage = function (img, objkt, retries, shouldRetry) {
            retries = retries || 0;
            shouldRetry = shouldRetry !== false;

            img.remove();

            imgLink.innerHTML = '';

            img = document.createElement('img');

            img.classList.add('token-artifact-preview');
    
            img.src = this._state.session.defaultGateway + '/ipfs/' + objkt.displayArtifactIpfsAddress.substring(7);
            img.fetchPriority = 'high';
    
            imgLink.appendChild(img);

            if (this._state.view.metadata.collectionStyle === 'masonry') {
                // imgLink.appendChild(img);

                this._state.holds = this._state.holds || [];

                this._state.holds.push(1);
                this._state.view.metadata.disableScrollHide = true;

                document.getElementsByClassName('token-artifact-preview') && Array.prototype.slice.call(document.getElementsByClassName('token-artifact-preview'), 0).forEach(function (img) {
                    img.classList.remove('hidden');
                });

                img.classList.add('transparent', 'placeholder');

                img.complete && img.classList.remove('transparent', 'placeholder');

                img.onload = function () {
                    this._state.holds = this._state.holds.slice(1);

                    img.classList.remove('transparent', 'placeholder');
                    // img.setAttribute('data-load-complete', 'true');

                    if (this._state.view.metadata.macy) {
                        this._state.view.metadata.macy.recalculate(true);
                    }

                    if (!this._state.holds.length) {
                        this._state.view.metadata.disableScrollHide = false;
                    }
                }.bind(this);

                img.onerror = function () {
                    if (shouldRetry) {
                        return loadImage(img, objkt, retries, false);
                    }

                    this._state.holds = this._state.holds.slice(1);

                    imgLink.classList.remove('transparent');

                    if (this._state.view.metadata.macy) {
                        this._state.view.metadata.macy.recalculate(true);
                    }

                    if (!this._state.holds.length) {
                        this._state.view.metadata.disableScrollHide = false;
                    }
                }.bind(this);
            } else {
                img.onload = function () {
                    if (img.naturalHeight === img.naturalWidth) {
                        container.classList.add('square-aspect');
                    } else if (img.naturalHeight < img.naturalWidth) {
                        if (img.naturalWidth - (img.naturalWidth - img.naturalHeight) >= img.naturalWidth * .9) {
                            container.classList.add('square-aspect');
                        } else {
                            container.classList.add('landscape-aspect');
                        }
                    } else {
                        container.classList.add('portrait-aspect');
                    }
                }.bind(this);

                img.onerror = function () {
                    if (shouldRetry) {
                        loadImage(img, objkt, retries, false);
                    }
                };
            }

            setTimeout(function () {
                if (!img.naturalHeight && !img.naturalWidth) {
                    retries++;

                    if (shouldRetry && retries < 2) {
                        loadImage(img, objkt, retries);
                    }
                }

                if (this._state.view.metadata.collectionStyle !== 'masonry') {
                    if (img.naturalHeight === img.naturalWidth) {
                        container.classList.add('square-aspect');
                    } else if (img.naturalHeight < img.naturalWidth) {
                        if (img.naturalWidth - (img.naturalWidth - img.naturalHeight) >= img.naturalWidth * .9) {
                            container.classList.add('square-aspect');
                        } else {
                            container.classList.add('landscape-aspect');
                        }
                    } else {
                        container.classList.add('portrait-aspect');
                    }
                }
            }.bind(this), 7000);
        }.bind(this);

        loadImage(img, objkt);

        if (this._state.view.metadata.collectionStyle === 'masonry') {
            return imgLink;            
        }

        var table = document.createElement('div');

        table.classList.add('table');

        var tableCell = document.createElement('div');

        tableCell.classList.add('table-cell');
        tableCell.appendChild(imgLink);
        table.appendChild(tableCell);

        var previewContainer = document.createElement('div');

        previewContainer.classList.add('token-artifact-preview-container');
        previewContainer.appendChild(table);

        var container = document.createElement('div');

        container.classList.add('token-container');

        container.appendChild(previewContainer);

        var metadataContainer = document.createElement('div');

        metadataContainer.classList.add('token-metadata-container');

        if (this._state.view.metadata.isAnonymousTargetAddress) {
            metadataContainer.classList.add('anonymous');
        }

        if (!this._state.view.metadata.isAnonymousTargetAddress) {
            var collectionByArtistUrl = Util.getHost() + Util.querystring({
                view: 'collection',
                tz: this._state.view.metadata.targetAddress,
                i_tz: objkt.issuer.address,
                collection_style: this._state.urlQuerystrings.collection_style || 'grid'
            }).toString();
    
            metadataContainer.innerHTML = '<div class="table">'
                                            + '<div class="table-cell">'
                                                + '<a class="token-collection" href="' + (Util.getHost() + Util.querystring({view: 'collection', contract: objkt.contract})) + '">'
                                                    + (objkt.issuer.collection || objkt.issuer.platformDisplay)
                                                + '</a>'
                                                + '<p class="token-title">' + Util.truncateString(objkt.name, 50) + '</p>'
                                                + '<a class="token-creator" href="'+ collectionByArtistUrl + '">'
                                                    + (objkt.issuer.handle ? Util.truncateString(objkt.issuer.handle, 50) : Util.truncateAddress(objkt.issuer.address))
                                                + '</a>'
                                            + '</div>'
                                        + '</div>';
        } else {
            metadataContainer.innerHTML = '<div class="table">'
                                            + '<div class="table-cell">'
                                                + '<span class="token-collection">'
                                                    + (objkt.issuer.collection || objkt.issuer.platformDisplay)
                                                + '</span>'
                                                + '<p class="token-title">' + Util.truncateString(objkt.name, 50) + '</p>'
                                                + '<span class="token-creator">'
                                                    + (objkt.issuer.handle ? Util.truncateString(objkt.issuer.handle, 50) : Util.truncateAddress(objkt.issuer.address))
                                                + '</span>'
                                            + '</div>'
                                        + '</div>';
        }

        var tokenSettingsToggle = document.createElement('div');

        tokenSettingsToggle.classList.add('token-settings-toggle');

        tokenSettingsToggle.innerHTML = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve" class="token-settings-toggle-icon">'
        + '<g>'
           + '<path d="M451.375,211.478c-5.076-22.364-13.894-43.302-25.759-62.131l42.884-42.884l-62.963-62.964l-42.884,42.884c-18.829-11.864-39.767-20.684-62.131-25.758V0h-89.043v60.625c-22.364,5.076-43.302,13.894-62.131,25.759l-42.884-42.886l-62.964,62.964l42.884,42.884c-11.864,18.829-20.684,39.767-25.758,62.131H0v89.043h60.625c5.076,22.364,13.894,43.302,25.759,62.131l-42.886,42.885l62.963,62.964l42.884-42.884c18.829,11.865,39.768,20.684,62.131,25.759V512h89.043v-60.625c22.364-5.076,43.302-13.894,62.131-25.759l42.884,42.884l62.964-62.964l-42.884-42.884c11.865-18.829,20.684-39.768,25.759-62.131H512v-89.042H451.375z M256,367.304c-61.472,0-111.304-49.832-111.304-111.304S194.528,144.696,256,144.696S367.304,194.528,367.304,256S317.472,367.304,256,367.304z"/>'
        + '</g>'
        + '</svg>';

        metadataContainer.appendChild(tokenSettingsToggle);
        /**
         * Add token type
         */

        var tokenMime = document.createElement('span');

        tokenMime.classList.add('token-mime-type');

        var typeComponents = objkt.mime.split('/');
        var urlBase = Util.getHost() + Util.querystring({view: 'collection'});

        if (!this._state.view.metadata.isAnonymousTargetAddress) {
            tokenMime.innerHTML = '<a href="' + (urlBase + '&type=' + objkt.type) + '">'
                                    + typeComponents[0] 
                                + '</a> / <a href="' + (urlBase + '&mime=' + encodeURIComponent(objkt.mime)) + '">'
                                    + typeComponents[1]
                                + '</a>';
        } else {
            tokenMime.innerHTML = '<span>'
                                + typeComponents[0]
                                + '</span> / <span>'
                                + typeComponents[1]
                                + '</span>';
        }

        metadataContainer.appendChild(tokenMime);

        /**
         * Add ipfs link
         */

        var tokenIpfsLink = document.createElement('a');

        tokenIpfsLink.classList.add('token-artifact-link');
        tokenIpfsLink.setAttribute('target', '_blank');

        tokenIpfsLink.href = objkt.gatewayUri;
        tokenIpfsLink.innerText = 'Artifact';

        // metadataContainer.appendChild(tokenIpfsLink);

        /**
         * Add token settings menu
         */

        var tokenSettingsMenu = document.createElement('div');

        tokenSettingsMenu.classList.add('token-settings-container', 'hidden');

        // Token settings menu options
        var menuOptions = [
            {
                text: 'View Original Listing',
                href: objkt.platformUri
            },
            {
                text: 'View in New Tab',
                href: Util.getHost() + Util.querystring({
                    view: 'artifact',
                    ipfs: this._state.session.defaultGateway + '/ipfs/' + objkt.ipfsLink.substring(7),
                    title: objkt.name,
                    mime: objkt.mime
                }).toString()
            }
        ];

        if (!Util.isMobile()) {
            menuOptions.push({
                text: 'View in New Window',
                handler: function () {
                    this._state.assistant.loadText('Deploying Pop-Out viewer!', {reason: 'OPEN_POP_OUT_VIEWER', chatter: true});

                    var imageTag = imgLink.getElementsByTagName('img').item(0);
                    var imgHeight = imageTag.naturalHeight || document.body.clientHeight;
                    var imgWidth = imageTag.naturalWidth || document.body.clientWidth;

                    if (imgHeight >  window.innerHeight || imgWidth > window.innerWidth) {
                        imgHeight = imgHeight * .60;
                        imgWidth = imgWidth * .60;
                    }

                    var url = Util.getHost() + Util.querystring({
                        view: 'artifact',
                        ipfs: this._state.session.defaultGateway + '/ipfs/' + objkt.ipfsLink.substring(7),
                        title: objkt.name,
                        mime: objkt.mime,
                        cw: imgWidth,
                        ch: imgHeight,
                        windowed: true,
                    }).toString();

                    // var url = this._state.session.defaultGateway + '/ipfs/' + objkt.ipfsLink.substring(7);

                    window.open(url, '_blank', 'left=0,top=0,innerWidth=' + imgWidth + ',innerHeight=' + imgHeight);
                }
            });
        }

        if (!this._state.view.metadata.isAnonymousTargetAddress) {
            menuOptions.push({
                text: 'Gallery Settings',
                handler: function () {
                    // this._state.assistant.loadText(
                    //     'You can add [ADD] or remove [RMV] the token from any of your galleries.'
                    //     +'\n\nTry creating a new gallery [here](' + Util.getHost() + '?view=galleries' + ')!'
                    //     , {
                    //         wait: 5000,
                    //         once: true,
                    //         reason: 'GALLERY_SETTINGS_TOOLTIP'
                    //     }
                    // );

                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_POP_UP_GALLERY_OPEN, objkt);
                }
            });

            menuOptions.push({
                text: 'Set B.A.E. Avatar',
                handler: function () {
                    this._state.session.assistant = this._state.session.assistant || {};
                    this._state.session.assistant.avatar = this._state.session.assistant.avatar || {};



                    this._state.assistant.loadText('Setting new B.A.E. avatar\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.', {
                        wait: 250,
                        callback: function () {
                            var currentTid = this._state.session.assistant.avatar.tid;

                            this._state.session.assistant.avatar.tid = objkt.tid;

                            var appliedMessage = 'Avatar applied!\n\nYou can set my avatar back to the DEFAULT avatar in the [settings](' + (Util.getHost() + '?view=settings') + ') menu.';

                            if (!currentTid) {
                                this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);

                                return setTimeout(function () {
                                    this._state.assistant.loadAvatar();

                                    return this._state.assistant.loadText(appliedMessage, {
                                        wait: 5000
                                    });
                                }.bind(this), 500);
                            }

                            setTimeout(function () {
                                this._state.assistant.loadAvatar();
                                this._state.assistant.confirm('How is this avatar?\n\nWould you like me to keep it?', {
                                    confirmCallback: function () {
                                        this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);

                                        return setTimeout(function () {
                                            return this._state.assistant.loadText(appliedMessage, {
                                                wait: 5000
                                            });
                                        }.bind(this), 250);
                                    }.bind(this),
                                    denyCallback: function () {
                                        this._state.assistant.loadText('Reverting B.A.E. avatar\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.', {
                                            wait: 250,
                                            callback: function () {
                                                this._state.session.assistant.avatar.tid = currentTid;

                                                return setTimeout(function () {
                                                    this._state.assistant.loadAvatar();
                                                    this._state.assistant.loadText('Avatar reset!', {
                                                        wait: 1000
                                                    });
                                                }.bind(this), 250);
    
                                            }.bind(this)
                                        });
                                    }.bind(this)
                                });
                            }.bind(this), 500);
                        }.bind(this)
                    });
                }
            });
        }

        // Add token settings menu options to token settings menu container.
        for (var i = 0; i < menuOptions.length; i++) {
            var menuOption = menuOptions[i];
            var el = document.createElement(menuOption.href ? 'a' : 'div');

            el.classList.add('token-settings-option');

            el.innerText = menuOption.text;

            if (menuOption.href) {
                el.href = menuOption.href;

                el.setAttribute('target', '_blank');
            } else {
                el.addEventListener('click', menuOption.handler.bind(this));
            }

            tokenSettingsMenu.appendChild(el);
        }

        metadataContainer.appendChild(tokenSettingsMenu);

        // Add metadata container to token container
        container.appendChild(metadataContainer);
    
        /**
         * Attach event handlers to token container elements
         */

        // Track if settings menu is being opened this event loop cycle
        var settingsOpening = false;

        // Open token settings menu if the user clicks token settings menu icon
        tokenSettingsToggle.addEventListener('click', function () {
            var target;

            for (var i = 0; i < tokenSettingsToggle.childNodes.length; i++) {
                if (tokenSettingsToggle.childNodes[i].classList.contains('token-settings-toggle-icon')) {
                  target = tokenSettingsToggle.childNodes[i];

                  break;
                }        
            }

            if (target)  {
                target.classList.add('spin');

                setTimeout(function () {
                    target.classList.remove('spin');
                }, 250);
            }
            // If hidden - reveal menu, flag the menu as opening, and unflag next loop cycle
            if (Array.prototype.slice.call(tokenSettingsMenu.classList, 0).indexOf('hidden') !== -1) {
                tokenSettingsMenu.classList.remove('hidden');
                // Flag as opening
                settingsOpening = true;

                // Wait until next loop cycle.
                setTimeout(function () {
                    // Flag as not opening.
                    settingsOpening = false;
                }, 0);
            }
            // If the menu wasn't hidden the following handler will close it.
        });

        // Close the settings menu if document is clicked and menu is not being opened this loop cycle.
        document.addEventListener('click', function () {
            if (!settingsOpening) {
                tokenSettingsMenu.classList.add('hidden');
            }
        }.bind(this));

        return container;
    };

    CollectionView.prototype._initState = function (state) {
        this._super._initState.call(this._super, state);

        this._state.view.metadata.owner = {};
        this._state.view.metadata.collectionStyle = state.urlQuerystrings.collection_style || 'grid';
        this._state.view.metadata.owner.address = state.urlQuerystrings.tz;
        this._state.view.metadata.targetAddress = state.urlQuerystrings.tz || state.wallet.getActiveAccount().address;
        this._state.view.metadata.isAnonymousTargetAddress = state.urlQuerystrings.tz
            && (state.wallet.getActiveAccount().anonymous || state.wallet.getActiveAccount().address !== state.urlQuerystrings.tz);
        // this._state.view.metadata.pagination = ;

        var issuerAddress = state.urlQuerystrings.i_tz;

        if (issuerAddress) {
            this._state.view.metadata.issuerAddress = issuerAddress;
        }
    
        // if (state.urlQuerystrings.gallery) {
            /**
             * Decode and parse gallery data if provided.
             */
            // var decodedGalleryOption = Util.decodeGalleryURIComponent(state, state.urlQuerystrings.gallery);

            // if (state.wallet.getActiveAccount().address === state.urlQuerystrings.tz) {
            //     return window.location.replace(Util.getHost() + Util.querystring({
            //         view: 'collection',
            //         gid: decodedGalleryOption.id
            //     }).toString());
            // }

            // try {
            //     this._state.view.metadata.galleryMap = JSON.parse(decodedGalleryOption);
            // } catch (err) {
            //     console.error('Failed to parse querystring gallery JSON');

            //     throw err;
            // }
        // }
    };

    CollectionView.prototype._getTokenPage = function (options) {
        var tokenCollectionOptions = {
            page: options.page,
            limit: this._state.session.itemsPerPage
        };

        var collectionIndex = options.collectionIndex;

        var tokenPage;

        if (this._state.view.metadata.issuerAddress) {
            tokenPage = collectionIndex.issuerAddressCollectionMap[this._state.view.metadata.issuerAddress].getTokens(tokenCollectionOptions);
        } else if (this._state.urlQuerystrings.type) {
            tokenPage = collectionIndex.tokenTypeCollectionMap[this._state.urlQuerystrings.type].getTokens(tokenCollectionOptions);
        } else if (this._state.urlQuerystrings.mime) {
            tokenPage = collectionIndex.tokenMimeTypeCollectionMap[decodeURIComponent(this._state.urlQuerystrings.mime)].getTokens(tokenCollectionOptions);
        } else if (this._state.urlQuerystrings.contract) {
            tokenPage = collectionIndex.issuerContractCollectionMap[decodeURIComponent(this._state.urlQuerystrings.contract)].getTokens(tokenCollectionOptions);
        } else if (this._state.urlQuerystrings.gallery || (this._state.urlQuerystrings.gid || parseInt(this._state.urlQuerystrings.gid) === 0)) {
            // @TODO need to convert the gallery tid list to a TokenCollection, prolly on localStorage read, replace the galleryMap values with TokenCollection
            // instances, and return the TokenCollection belonging to the gallery at index gid.
            var galleryCollection = this._state.view.metadata.isAnonymousTargetAddress
                ? this._state.anonymousGalleryCollection
                : this._state.session.galleryMap[this._state.urlQuerystrings.gid].collection;

            tokenPage = galleryCollection.getTokens(tokenCollectionOptions);
        } else {
            tokenPage = collectionIndex.totalCollection.getTokens(tokenCollectionOptions);
        }

        this._state.view.metadata.page = tokenPage.page;

        return tokenPage;
    };

    CollectionView.prototype._renderCollection = function (options) {
        options = options || {};

        // if (opts.retain !== true) {
        //     contentContainer.innerHTML = '';
        // }

        // var viewMeta = this._state.view.metadata;
        // var self = this;

        // self._state.view.metadata.isLoadingCollection = true;

        // if (opts.retain !== true) {
        //     document.getElementById('footer').classList.add('hidden');
        //     document.getElementById('next-page-controls').classList.add('hidden');
        //     document.getElementById('main-content').classList.add('hidden');
        //     document.getElementById('main-content').classList.add('transparent');
        //     document.getElementById('main-content-loading-screen').classList.remove('hidden', 'transparent');
        // }

        // return this._state.tokens.getCollectionByWallet(this._state, viewMeta.targetAddress, viewMeta.galleryMap, viewMeta.issuerAddress)
        var collectionIndex = this._state.tokens.getCollection(this._state.view.metadata.targetAddress);

        window.objktiv.systemSession.tutorials = window.objktiv.systemSession.tutorials || {};

        // No token collection for address
        if (!collectionIndex) {
            if (!options.attempts) {
                if (this._state.view.metadata.isAnonymousTargetAddress) {

                    if (!window.objktiv.systemSession.tutorials.anonymousViewing) {
                        window.objktiv.systemSession.tutorials.anonymousViewing = true;

                        window.localStorage.setItem('OBJKTIV_SYSTEM_SESSION', JSON.stringify(window.objktiv.systemSession));

                        this._state.assistant.loadText(
                            'Anonymous viewing mode enabled!'
                            + '\n\nI\'ll need to gather this wallet\'s tokens from the network for viewing.'
                            , {
                                wait: 3000,
                                callback: function () {
                                    this._state.assistant.loadText(
                                        'Since this collection is anonymous I won\'t be saving it locally.\n\nYour viewing options may be limited compared to viewing your own collection.'
                                        , {
                                            wait: 3000
                                        }
                                    );
                                }.bind(this)
                            }
                        );
                    }
                } else {
                    if (!window.objktiv.systemSession.tutorials.firstTimeSignIn) {
                        window.objktiv.systemSession.tutorials.firstTimeSignIn = true;

                        window.localStorage.setItem('OBJKTIV_SYSTEM_SESSION', JSON.stringify(window.objktiv.systemSession));

                        this._state.assistant.loadText(
                            'Now that you\'re connected I can gather your token metadata and build a local index.'
                            , {
                                wait: 4000,
                                callback: function () {
                                    this._state.assistant.loadText(
                                        'This will allow me to display your token collection in new ways, such as by file type, by artist, and by smart contract!'
                                        , {
                                            wait: 3000,
                                            callback: function () {
                                                this._state.assistant.loadText(
                                                    'You can use the various hyperlinks in a token\'s frame to navigate to different collection views.'
                                                    , {
                                                        wait: 3000
                                                    }
                                                );
                                            }.bind(this)
                                        }
                                    );
                                }.bind(this)
                            }
                        );
                    }
                }
            } else if (options.attempts > 2) {
                this._state.assistant.loadText('I seem to be having trouble gathering token metadata from the network\n\nPlease hold.', {chatter: true});
            }

            console.log('No tokens for _renderCollection');

            setTimeout(function () {
                options.attempts = options.attempts ? options.attempts + 1 : 1;

                this._renderCollection(options);
            }.bind(this), 1000);

            return false;
        }

        document.getElementById('page-control-nav').classList.remove('hidden');
        document.getElementById('view-style-nav').classList.remove('hidden');

        options.collectionIndex = collectionIndex;

        // Disable page buttons while tokens load
        document.getElementById('decrease-items-per-page').classList.add('disabled');
        document.getElementById('increase-items-per-page').classList.add('disabled');
        document.getElementById('load-more').classList.add('disabled');

        if (this._state.view.metadata.collectionStyle === 'masonry') {
            document.getElementById('previous-page').classList.add('hidden');
            document.getElementById('previous-page-mobile').classList.add('hidden');
            document.getElementById('next-page').classList.add('hidden');
            document.getElementById('next-page-mobile').classList.add('hidden');
            document.getElementById('next-page-control-flare').classList.add('hidden');
            document.getElementById('load-more-wrapper').classList.remove('hidden');
        }

        var contentContainer = document.getElementById('main-content');

        if (!options.retain) {
            // Wipe existing content from main content container
            contentContainer.innerHTML = '';
        }

        var tokenPage = this._getTokenPage(options);

        for (var i = 0; i < tokenPage.tokens.length; i++) {
            contentContainer.appendChild(this._createTokenContainer(tokenPage.tokens[i]));
        }

        if (tokenPage.isLastPage) {
            /**
             * Disable next page button if we are on the last page.
             */

            document.getElementById('next-page').classList.add('disabled');
            document.getElementById('next-page-mobile').classList.add('disabled');
            document.getElementById('load-more').classList.add('disabled');
        } else {
            /**
             * Enable next page button if we are not on the last page.
             */

            document.getElementById('next-page').classList.remove('disabled');
            document.getElementById('next-page-mobile').classList.remove('disabled');
            document.getElementById('load-more').classList.remove('disabled');
        }

        if (tokenPage.page === 0) {
            /**
             * Disable previous page button if we are on the first page.
             */

            document.getElementById('previous-page').classList.add('disabled');
            document.getElementById('previous-page-mobile').classList.add('disabled');
        } else {
            /**
             * Enable previous page button if we are not on the first page.
             */

            document.getElementById('previous-page').classList.remove('disabled');
            document.getElementById('previous-page-mobile').classList.remove('disabled');
        }

        // Remove opacity transition class before we fade out loading screen.
        document.getElementById('main-content').classList.remove('transparent');

        /**
         * Reveal collection page control elements now that collection has loaded.
         */

        document.getElementById('footer').classList.remove('hidden');
        document.getElementById('decrease-items-per-page').classList.remove('disabled');
        document.getElementById('increase-items-per-page').classList.remove('disabled');

        // Fade out loading screen
        document.getElementById('main-content-loading-screen').classList.add('transparent');

        // Wait the fade out animation time before revealing content.
        setTimeout(function () {
            // Hide loading screen
            document.getElementById('main-content-loading-screen').classList.add('hidden');
            if (this._state.view.metadata.collectionStyle === 'masonry') {
                document.getElementById('main-content').classList.add('masonry-grid');
    
                if (!this._state.view.metadata.macy) {
                    this._state.view.metadata.macy = window.Macy({
                        columns: 5,
                        container: '#main-content',
                        useContainerForBreakpoints: true,
                        breakAt: {
                            1500: 4,
                            960: 3,
                            500: 2
                        },
                        margin: 12.5
                    });
                }
            }

            /**
             * Macy has issues rendering new token lists as they are populated,
             * so need to force recalculation to correct the masonry grid.
             * 
             * It also was having issues applying the fix on the same render cycle,
             * so we need to kick the reveal + recalculate over to the next JS loop cycle.
             */

            setTimeout(function () {
                document.getElementById('main-content').classList.remove('hidden');
                this._state.view.metadata.macy && this._state.view.metadata.macy.recalculate(true);
                document.getElementById('next-page-controls').classList.remove('hidden');
            }.bind(this), 0)

            // Reveal main content
            
        }.bind(this), 100);
            // .then(function (sortedCollection) {
            //     if (!sortedCollection.length) {
            //         return false;
            //     }

            //     if (sortedCollection.length <= this._state.session.itemsPerPage) {
            //         this._state.view.metadata.pagination.isLastPage = true;
            //     } else {
            //         this._state.view.metadata.pagination.isLastPage = false;
            //     }

            //     var selectedCollection = sortedCollection.slice(0, this._state.session.itemsPerPage);

            //     this._state.view.metadata.pagination.pageSkips.push(JSON.parse(JSON.stringify(this._state.view.metadata.pagination.skipCounts)));

            //     for (var i = 0; i < selectedCollection.length; i++) {
            //         var objkt = selectedCollection[i];
            //         var platform = objkt.issuer.platform.toLowerCase();

            //         this._state.view.metadata.pagination.skipCounts[platform] += 1;
            //     }

            //     return selectedCollection;
            // }.bind(this))
            // .then(function (tokens) {
            //     if (!tokens) {
            //         return false;
            //     }

            //     /**
            //      * Populate tokens UI elements
            //      */

            //     for (var i = 0; i < tokens.length; i++) {
            //         contentContainer.appendChild(self._createTokenContainer(tokens[i]));
            //     }

            //     /**
            //      * Set the disabled state on next/prev page buttons and reveal page controls
            //      */

            //     if (self._state.view.metadata.pagination.isLastPage) {
            //         document.getElementById('next-page').classList.add('disabled');
            //         document.getElementById('next-page-mobile').classList.add('disabled');
            //         document.getElementById('load-more').classList.add('disabled');
            //     } else {
            //         document.getElementById('next-page').classList.remove('disabled');
            //         document.getElementById('next-page-mobile').classList.remove('disabled');
            //         document.getElementById('load-more').classList.remove('disabled');
            //     }
    
            //     if (self._state.view.metadata.pagination.pageSkips.length === 1) {
            //         document.getElementById('previous-page').classList.add('disabled');
            //         document.getElementById('previous-page-mobile').classList.add('disabled');
            //     } else {
            //         document.getElementById('previous-page').classList.remove('disabled');
            //         document.getElementById('previous-page-mobile').classList.remove('disabled');
            //     }

            //     if (opts.retain !== true) {
            //         document.getElementById('main-content-loading-screen').classList.add('transparent');
            //     }

            //     setTimeout(function () {
            //         document.getElementById('main-content').classList.remove('hidden');

            //         if (self._state.view.metadata.collectionStyle === 'masonry') {
            //             document.getElementById('main-content').classList.add('masonry-grid');

            //             if (!self._state.view.metadata.macy) {
            //                 var masonryGrid = self._state.view.metadata.macy = window.Macy({
            //                     columns: 5,
            //                     container: '#main-content',
            //                     useContainerForBreakpoints: true,
            //                     breakAt: {
            //                         1500: 4,
            //                         960: 3,
            //                         500: 2
            //                     },
            //                     margin: 12.5
            //                 });
            //             }
            //         }

            //         if (opts.retain !== true) {
            //             document.getElementById('main-content-loading-screen').classList.add('hidden');
            //             document.getElementById('next-page-controls').classList.remove('hidden');
            //             document.getElementById('footer').classList.remove('hidden');

            //             setTimeout(function () {
            //                 document.getElementById('main-content').classList.remove('transparent');
            //                 document.getElementById('decrease-items-per-page').classList.remove('disabled');
            //                 document.getElementById('increase-items-per-page').classList.remove('disabled');
            //                 // document.getElementById('load-more-wrapper').classList.remove('disabled');
            //             }, 250);
            //         } else {
            //             document.getElementById('decrease-items-per-page').classList.remove('disabled');
            //             document.getElementById('increase-items-per-page').classList.remove('disabled');
            //             // document.getElementById('load-more-wrapper').classList.remove('disabled');
            //         }

            //         self._state.view.metadata.isLoadingCollection = false;

            //         cb && typeof cb === 'function' && cb();
            //     }, 100);
            // });
    };

    // CollectionView.prototype._resetSkipCounts = function () {
    //     var platforms = Object.keys(this._state.view.metadata.pagination.skipCounts);

    //     for (var i = 0; i < platforms.length; i++) {
    //         this._state.view.metadata.pagination.skipCounts[platforms[i]] = 0;
    //     }
    // };

    CollectionView.prototype.render = function() {
        this._super.render();

        // If there's no sync'd wallet, and we aren't trying to view a wallet anonymously, then we have no collection to show.
        if (this._state.wallet.getActiveAccount().anonymous && !this._state.view.metadata.owner.address) {
            console.warn('No wallet to target for CollectionView');

            document.getElementById('main-content-loading-screen').classList.add('hidden', 'transparent');

            this._state.assistant.loadText(
                'You don\'t have a wallet sync\'d, so I\'m not sure which collection to load...'
            , {
                callback: function () {
                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SIDEBAR_TOGGLE);
                    this._state.assistant.loadText(
                        'You can use the menu to sync a Tezos wallet to view its collection.'
                    , {
                        wait: 3000,
                        callback: function () {
                            this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SIDEBAR_TOGGLE);
                            document.getElementById('wallet-lookup-input').focus();
                            document.getElementById('wallet-lookup-submit').classList.add('hover');
                            this._state.assistant.loadText(
                                'You can also use the input field at the top of the page to view a collection by address.'
                            , {
                                wait: 3000,
                                callback: function () {
                                    document.getElementById('wallet-lookup-input').blur();
                                    document.getElementById('wallet-lookup-submit').classList.remove('hover');
                                }.bind(this)
                            });
                        }.bind(this)
                    });
                }.bind(this)
            });

            // this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SIDEBAR_TOGGLE);

            // this._state.assistant.confirm(
            //     'You don\'t have a wallet sync\'d, so I\'m not sure which collection to load.'
            //     + '\n\nDo you want me to take you to the live token feed instead?'
            // , {
            //     denyCallback: function () {
            //         this._state.assistant.loadText(
            //             'Okay...'
            //             + '\n\n You can use the menu to sync a Tezos wallet, or navigate to the live feed from there if you change your mind.'
            //             + '\n\n You can also use the input field at the top of the page to view a collection by address!'
            //         , {
            //             wait: 10000
            //         })
            //     }.bind(this)
            // });

            return false;
        }

        this._renderCollection({
            page: this._state.urlQuerystrings.page && parseInt(this._state.urlQuerystrings.page) > 0
                ? this._state.urlQuerystrings.page - 1 : 0
        });
    };

    window.CollectionView = CollectionView;
})();