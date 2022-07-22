(function () {
    var Util = window.Util;
    var View = window.View;
    var NewGalleryForm = window.NewGalleryForm;

    function GalleryManagementView(state) {
        Util.addSuper(this, View);
        View.call(this, state);
    }

    GalleryManagementView.prototype = Object.create(View.prototype);

    GalleryManagementView.prototype._addEventHandlers = function () {
        this._super._addEventHandlers();

        this._state.eventEmitter.on(Util.eventKeys.SESSION_SAVE, function () {
            if (this._state.view.metadata.selectedGalleryMetadata) {
                this.populateTokenMetadata(this._state.view.metadata.selectedGalleryMetadata);
                this._renderGalleryList();
                document.getElementById('gallery-' + this._state.view.metadata.selectedGalleryMetadata.id).classList.add('selected');
            } else {
                this._renderGalleryList();
            }
        }.bind(this));

        // @TODO move to assistant event handlers
        this._state.eventEmitter.on(Util.eventKeys.GALLERY_CREATE, function (galleryMetadata) {
            window.objktiv.systemSession.tutorials = window.objktiv.systemSession.tutorials || {};

            if (!window.objktiv.systemSession.tutorials.galleryCreation) {
                window.objktiv.systemSession.tutorials.galleryCreation = true;

                window.localStorage.setItem('OBJKTIV_SYSTEM_SESSION', JSON.stringify(window.objktiv.systemSession));

                var galleryCreateMessage = 'Gallery created!\n\nYou can add tokens to '
                    + '"' + galleryMetadata.displayName + '"'
                    + ' by viewing your token collection, and opening a token\'s settings menu.';

                this._state.assistant.loadText(galleryCreateMessage)
            }

            this._state.assistant.loadText('Gallery created!', {chatter: true});
        }.bind(this));
    };

    GalleryManagementView.prototype._attachGestureHandlers = function () {
        this._super._attachGestureHandlers();

        var submitGalleryNameChange = function () {
            var newText = document.getElementById('gallery-metadata-title-input').innerText;
            var oldText = this._state.view.metadata.selectedGalleryMetadata.displayName;

            if (newText !== oldText) {
                var self = this;

                this._state.assistant.confirm(
                    'Change the gallery title from "' + oldText + '" to "' + newText + '"?',
                    {
                        confirmCallback: function () {
                            var galleryId = this._state.view.metadata.selectedGalleryMetadata.id;

                            this._state.session.galleryMap[galleryId].displayName = newText;

                            this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE);
                        }.bind(self),
                        denyCallback: function () {
                            document.getElementById('gallery-metadata-title-input').innerText = oldText;
                        }.bind(self),
                    }
                );
            }
        }.bind(this);

        document.getElementById('gallery-metadata-title-input').addEventListener('keypress', function (evt) {
            if (evt.code && evt.code === 'Enter' || evt.keyCode && evt.keyCode === 13) {
                submitGalleryNameChange();
                evt.preventDefault();
            }
        });

        document.getElementById('gallery-metadata-title-input-submit').addEventListener('click', submitGalleryNameChange);

        document.getElementById('gallery-metadata-delete-gallery').addEventListener('click', function () {
            var self = this;

            this._state.assistant.confirm(
                'Are you sure you want to delete "' + this._state.view.metadata.selectedGalleryMetadata.displayName + '"?',
                {
                    confirmCallback: function () {
                        var galleryId = this._state.view.metadata.selectedGalleryMetadata.id;

                        this._state.view.metadata.selectedGalleryMetadata = null;

                        delete this._state.session.galleryMap[galleryId];
            
                        this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE);
                        this.removeTokenMetadata();
                        this._state.assistant.loadText('Gallery deleted.');
                    }.bind(self)
                }
            );
        }.bind(this));
    };

    GalleryManagementView.prototype._renderGalleryList = function () {
        var galleryContainer = document.getElementById('gallery-list');

        galleryContainer.innerHTML = '';

        var galleryIdTokenMap = this._state.session.galleryMap;
        var galleryIds = Object.keys(galleryIdTokenMap);

        galleryIds = galleryIds.sort(function (a, b) {
            return galleryIdTokenMap[a].displayName.toLowerCase().charCodeAt(0) - galleryIdTokenMap[b].displayName.toLowerCase().charCodeAt(0);
        });

        for (var i = 0; i < galleryIds.length; i++) {
            var galleryId = galleryIds[i];
            var galleryMetadata = galleryIdTokenMap[galleryId];
            var galleryItem = document.createElement('div');

            galleryItem.classList.add('gallery-item');
            galleryItem.id = 'gallery-' + galleryId;

            var galleryUrl = Util.getHost()
                + '?view=collection'
                + '&tz=' + this._state.wallet.getActiveAccount().address
                + '&gid=' + galleryId
                + '&gallery=' + Util.encodeGalleryURIComponent(this._state, galleryId);

            galleryItem.innerHTML = '<div class="gallery-title-container">'
                                        + '<span>' + Util.truncateString(galleryMetadata.displayName, 25) + '</span>'
                                    + '</div>'
                                    + '<div class="gallery-token-count-container">'
                                    + '</div>'
                                    + '<div class="gallery-settings-toggle-container">'
                                    + '</div>';

            (function (galleryMetadata, galleryItem) {
                galleryItem.addEventListener('click', function (evt) {
                    if (
                        this._state.view.metadata.selectedGalleryMetadata
                        && this._state.view.metadata.selectedGalleryMetadata.id === galleryMetadata.id
                    ) {
                        this.removeTokenMetadata();
                        galleryItem.classList.remove('selected');
                    } else {
                        this.populateTokenMetadata(galleryMetadata);
                        galleryItem.classList.add('selected');
                    }

                    evt.stopPropagation();
                }.bind(this));
            }.bind(this))(galleryMetadata, galleryItem);

            galleryContainer.appendChild(galleryItem);
        }
    };

    GalleryManagementView.prototype.populateTokenMetadata = function (galleryMetadata) {
        this.removeTokenMetadata();
        document.getElementById('gallery-metadata-container-interaction-block').classList.add('hidden');
        document.getElementById('gallery-metadata-container').classList.remove('disabled');

        this._state.view.metadata.selectedGalleryMetadata = galleryMetadata;

        var tidTokenMap = this._state.tokens.getCollection(this._state.wallet.getActiveAccount().address).tidTokenMap;

        for (var i = 0; i < galleryMetadata.tokens.length; i++) {
            this._addTokenToMetadataToList(tidTokenMap[galleryMetadata.tokens[i]], galleryMetadata.id);
        }

        document.getElementById('gallery-metadata-title-input').innerText = galleryMetadata.displayName;
        document.getElementById('gallery-metadata-token-count').innerText = galleryMetadata.tokens.length;

        var galleryUrl = Util.getHost()
            + '?view=collection'
            + '&tz=' + this._state.wallet.getActiveAccount().address
            + '&gid=' + galleryMetadata.id
            + '&gallery=' + Util.encodeGalleryURIComponent(this._state, galleryMetadata.id);

        document.getElementById('gallery-metadata-view-gallery').href = galleryUrl;
        document.getElementById('gallery-metadata-share-url').innerText = galleryUrl;
        document.getElementById('gallery-metadata-share-url-copy').onclick = function () {
            Util.copyToClipboard(galleryUrl);
            this._state.assistant.loadText('Gallery URL copied.');
        }.bind(this);
    };

    GalleryManagementView.prototype._addTokenToMetadataToList = function (token, galleryId) {
        var tokenContainer = document.getElementById('gallery-metadta-token-list');
        var containerId = 'preview-container-' + token.tid;
        var tokenItem = '<div class="gallery-metadata-token-item">'
                            + '<div id="remove-' + token.tid + '" class="remove-from-gallery interactive">[X]</div>'
                            + '<div class="token-preview-container">'
                                + '<div class="table">'
                                    + '<div id="' + containerId + '" class="table-cell">'
                                    +'</div>'
                                +'</div>'
                            +'</div>'
                            + '<div class="token-info-container">'
                                + '<div class="table">'
                                    + '<div class="table-cell">'
                                        + '<p>' + Util.truncateString(token.name, 20) + '</p>'
                                        + '<p>' + token.issuer.handle + '</p>'
                                    +'</div>'
                                +'</div>'
                            +'</div>'
                       +'</div>';

        tokenContainer.innerHTML += tokenItem;

        // The list item is added as innerHTML, so we need to let the DOM tree catch up before we start adding img elements to it.
        setTimeout(function ()  {
            var img = document.createElement('img');

            img.src = this._state.session.defaultGateway + '/ipfs/' + token.displayArtifactIpfsAddress.substring(7);
            img.id = 'preview-' + token.tid;
    
            var targetContainer = document.getElementById(containerId);
    
            img.onload = function () {
                var orientation = Util.getImageOrientation(img.naturalWidth, img.naturalHeight);

                if (orientation === 'SQUARE' || orientation === 'PORTRAIT') {
                    img.classList.add('portrait');
                } else {
                    img.classList.add('landscape');
                }
            };

            var removeButtom = document.getElementById('remove-' + token.tid);

            removeButtom.addEventListener('click', function () {
                Util.removeTokenFromActiveAccountGallery(this._state, galleryId, token.tid);
            }.bind(this));

            targetContainer.appendChild(img);
        }.bind(this), 0);
    };

    GalleryManagementView.prototype.removeTokenMetadata = function () {
        document.getElementById('gallery-metadata-container-interaction-block').classList.remove('hidden');
        var galleryItems = document.getElementsByClassName('gallery-item');

        for (var i = 0; i < galleryItems.length; i++) {
            galleryItems[i].classList.remove('selected');
        }

        document.getElementById('gallery-metadata-container').classList.add('disabled');

        this._state.view.metadata.selectedGalleryMetadata = null;
    
        document.getElementById('gallery-metadta-token-list').innerHTML = '';
        document.getElementById('gallery-metadata-title-input').innerText = '';
        document.getElementById('gallery-metadata-share-url').innerText = '';
        document.getElementById('gallery-metadata-token-count').innerText = '-';
    };

    GalleryManagementView.prototype.render = function () {
        this._super.render();

        var el = document.getElementById('gallery-list-container').getElementsByClassName('new-gallery-form').item(0);

        new NewGalleryForm(this._state, el).render();

        document.getElementById('gallery-management-view').classList.remove('hidden');

        this._renderGalleryList();
    }

    window.GalleryManagementView = GalleryManagementView;
})();