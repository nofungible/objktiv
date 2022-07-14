(function() {
    var View = window.View;

    var DEFAULT_BG_COLOR_OPTIONS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'];

    /**
     * Show an IPFS resource belonging to a token.
     * 
     * @params {Object} state Initialized volatile state object.
     */

    function TokenArtifactView(state, sessionStore) {
        Util.addSuper(this, View);
        View.call(this, state);
    }

    TokenArtifactView.prototype = Object.create(View.prototype);

    TokenArtifactView.prototype.render = function() {
        document.getElementById('cta-banner').classList.add('hidden');
        this._super.render();

        /**
         * Hide UI elements not required for TokenArtifactView.
         */

        document.getElementById('nav').classList.add('hidden');
        document.getElementById('header').classList.add('hidden');
        document.getElementById('footer').classList.add('hidden');
        document.getElementById('footer-push').classList.add('hidden');

        /**
         * Set page title to objkt title
         */

        var objktTitle = this._state.view.metadata.title;

        document.title = objktTitle;

        // Set a special class for extra long objkt titles to help with setting additional custom styles.
        var objktNameplateTitleClass =  objktTitle.length >= 45 ? 'extra-long-viewer-title' : '';

        // Apply objkt title and issuer title to objkt viewer nameplate
        document.getElementById('objkt-name').innerHTML = 
            '<span id="objkt-name-title" class="' + objktNameplateTitleClass + '">' + this._state.view.metadata.title + '</span>'
            + '<br>'
            + '<span id="objkt-name-artist">' + this._state.view.metadata.issuer.name + '</span>';

        // Add viewer bg color options to bg color picker menu
        for (var i = 0; i < DEFAULT_BG_COLOR_OPTIONS.length; i++) {
            this._addViewerBackgroundColorOption(DEFAULT_BG_COLOR_OPTIONS[i]);
        }

        /**
         * Construct HTML embed elements for simple resource mime types.
         */

        var resourceIpfsAddress = this._state.view.metadata.ipfsUrl;

        var htmlEmbedElementMap = {
            image: function (src) {
                var img = document.createElement('img');

                img.setAttribute('priority', 'high');

                img.src = src;
                img.id = 'image-resource';
                img.onerror = function () {

                };

                // Hide img until it's resized
                img.classList.add('hidden');

                resizeImage.call(this, img);

                function resizeImage() {
                    var w = img.naturalWidth;
                    var h = img.naturalHeight;
                    var windowW = window.innerWidth; 
                    var windowH = window.innerHeight;

                    if (!w || !h) {
                        return setTimeout(resizeImage.bind(this), 100);
                    }

                    var sizeMod = this._state.view.metadata.windowed ? 1 : .8;

                    if (w > windowW * sizeMod) {
                        img.style.width = (windowW * sizeMod) + 'px';
                        img.style.height = 'auto';
                    }

                    if (h > windowH * sizeMod) {
                        img.style.height = (windowH * sizeMod) + 'px';
                        img.style.width = 'auto';
                    }

                    document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');
                    img.classList.remove('hidden');
                }

                document.getElementById('token-view-content').appendChild(img);
            }.bind(this),
            video: function (src) {
                var video = document.createElement('video');

                video.id = "video-resource";

                video.setAttribute('autoplay', '');
                video.setAttribute('loop', '');
                video.setAttribute('controls', '');

                var source = document.createElement('source');

                source.setAttribute('src', src);

                // Hide video until it's resized
                video.classList.add('hidden');

                video.onloadeddata = video.onloadedmetadata = function () {
                    var w = video.videoWidth;
                    var h = video.videoHeight;
                    var windowW = window.innerWidth; 
                    var windowH = window.innerHeight;

                    var sizeMod = this._state.view.metadata.windowed ? 1 : .8;

                    if (w > windowW * sizeMod) {
                        video.style.width = (windowW * sizeMod) + 'px';
                        video.style.height = 'auto';
                    }

                    if (h > windowH * sizeMod) {
                        video.style.height = (windowH * sizeMod) + 'px';
                        video.style.width = 'auto';
                    }

                    document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');
                    video.classList.remove('hidden');
                }.bind(this);

                video.onerror = function () {

                };

                video.appendChild(source);
                document.getElementById('token-view-content').appendChild(video);
            }.bind(this),
            // model: function (src) {
            //     var modelViewer = document.createElement('model-viewer');

            //     modelViewer.classList.add('model-resource');
            //     modelViewer.setAttribute('camera-controls', '');
            //     modelViewer.setAttribute('ar', '');
            //     modelViewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
            //     modelViewer.setAttribute('src', src);

            //     var windowW = window.innerWidth; 
            //     var windowH = window.innerHeight;

            //     if (windowW < windowH) {
            //         modelViewer.style.width = (windowW * .8) + 'px';
            //         modelViewer.style.height = (windowW * .8) + 'px';
            //     } else {
            //         modelViewer.style.height = (windowH * .8) + 'px';
            //         modelViewer.style.width = (windowH * .8) + 'px';
            //     }

            //     document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');
            //     document.getElementById('token-view-content').appendChild(modelViewer);
            // },
            model: '<model-viewer class="model-resource" camera-controls ar ar-modes="webxr scene-viewer quick-look" src="' + resourceIpfsAddress + '"></model-viewer>',
            pdf: '<iframe class="pdf-resource" src="' + resourceIpfsAddress + '"></iframe>'
        };

        var mimeType = this._state.view.metadata.type;
        var fileType = mimeType.split('/')[0];
        var subType = mimeType.split('/')[1];
        var handler = htmlEmbedElementMap[fileType] || htmlEmbedElementMap[subType];

        /**
         * Embed simple HTML element or create, embed, and update src for iframe element.
         */

        if (handler) {
            if (typeof handler === 'function') {
                handler(resourceIpfsAddress);
            } else {
                document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');
                document.getElementById('token-view-content').innerHTML = handler;
            }
        } else {
            var iframeEl = document.createElement('iframe');

            iframeEl.setAttribute('id', 'interactive-resource');

            document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');
            document.getElementById('token-view-content').appendChild(iframeEl);
            iframeEl.setAttribute('src', resourceIpfsAddress);
        }

        // document.getElementById('token-artifact-view-loading-screen').classList.add('hidden');

        // var clientHeight = this._state.urlQuerystrings.ch && parseInt(this._state.urlQuerystrings.ch);
        // var heightDelta = 0;

        // if (clientHeight) {
        //     var contentHeight = document.getElementById('content').clientHeight;

        //     var heightDelta;

        //     if (contentHeight < clientHeight) {
        //         heightDelta = clientHeight - contentHeight;
        //     } else if (contentHeight > clientHeight) {
        //         heightDelta =  (contentHeight - clientHeight) * -1;
        //     }
        // }

        // var clientWidth = this._state.urlQuerystrings.ch && parseInt(this._state.urlQuerystrings.cw);
        // var widthDelta = 0;

        // if (clientWidth) {
        //     var contentWidth = document.getElementById('content').clientWidth;

        //     if (contentWidth < clientWidth) {
        //         widthDelta = clientWidth - contentWidth;
        //     } else if (contentWidth > clientWidth) {
        //         widthDelta =  (contentWidth - clientWidth) * -1;
        //     }
        // }

        // window.resizeBy(Math.floor(widthDelta), Math.floor(heightDelta));


        // // Fit the content to the footer dynamically since footer is absolute position w/ dynamic height
        // this._fitContentToFooter();

        // Reveal page view
        document.getElementById('token-view-content').classList.remove('hidden');
        document.getElementById('token-artifact-view').classList.remove('hidden');

        return true;
    };

    TokenArtifactView.prototype._addViewerBackgroundColorOption = function (newColor) {
        // Select menu for new color to be inserted into.
        var colorMenu = document.getElementById('bg-color-picker-menu');

        // Create new color option element.
        var colorOption = document.createElement('div');

        // Set the new color as the background color of the new color option.
        colorOption.style.background = newColor;

        /**
         * Apply necessary attributes.
         */

        colorOption.classList.add('color-option');
        colorOption.setAttribute('data-color', newColor);

        var self = this;

        // Add handler to toggle to new color when the new option is clicked.
        colorOption.addEventListener('click', function() {
            /**
             * Apply new color to user's session and store it. 
             */

            self._state.session.viewerBgColor = newColor;

            self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, self._state.wallet.getActiveAccount().address, self._state.session);

            /**
             * Apply the new color to the background and the current color visual indicator.
             */

            document.getElementById('token-view-content').style.background = newColor;
            document.getElementById('selected-bg-color').style.background = newColor;

            // Close color picker menu since we selected a new color.
            self._toggleColorPickerMenu(false);
        });

        // Add new color to color menu.
        colorMenu.appendChild(colorOption);
    }

    // TokenArtifactView.prototype._applySessionPreferences = function() {
    //     this._super._applySessionPreferences();

    //     /**
    //      * Apply users viewer background color preference. 
    //      */

    //     var selectedColor = this._state.session.viewerBgColor;

    //     document.getElementById('selected-bg-color').style.background = selectedColor;
    //     document.getElementById('token-view-content').style.background = selectedColor;
    // };

    TokenArtifactView.prototype._attachGestureHandlers = function() {
        var self = this;

        // Re fit content to footer if user resizes window.
        window.addEventListener('resize', this._fitContentToFooter, true);

        // Open color picker menu when selected color is picked. @TODO switch this to the entire container.
        document.getElementById('selected-bg-color').addEventListener('click', function(e) {
            self._toggleColorPickerMenu(!(self._state.view.metadata.colorMenuOpen));
            e.stopPropagation();
        });

        // Remove the hex color input placeholder text when clicked.
        document.getElementById("hex-color-picker").addEventListener('click', function() {
            document.getElementById('hex-color-picker').innerHTML = '';
        });

        // Create handler for the hex color picker Enter key input keypress and hex color submit button.
        var hexColorSubmitHandler = function() {
            var newColor = document.getElementById('hex-color-picker').textContent;

            // Strip hash to normalize input.
            newColor = newColor.replace('#', '');
        
            // We support 3 character and 6 character inputs for hexadecimal color representations.
            if (newColor.length === 3 || newColor.length === 6) {
                document.getElementById('selected-bg-color').style.background = '#' + newColor;
                document.getElementById('token-view-content').style.background = '#' + newColor;

                // Apply hash back to normalized input and add as the selected color.
                self._state.session.viewerBgColor = '#' + newColor;

                // Store the user's session with the new viewer color.
                self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, self._state.wallet.getActiveAccount().address, self._state.session);
                self._addViewerBackgroundColorOption('#' + newColor); 
            }

            // Close hex color picker menu when submitted.
            self._toggleColorPickerMenu(false);
        };

        // Invoke hexColorSubmitHandler when the user is focused on the respective input field and hits the 'Enter' key.
        document.getElementById("hex-color-picker").addEventListener('keypress', function(e) {
            // Provide support for both the 'code' property and the deprecated 'keyCode' property as a fallback.
            if (e.code && e.code === 'Enter' || e.keyCode && e.keyCode === 13) {
                e.preventDefault();
                hexColorSubmitHandler();
            }
        });

        // Invoke hexColorSubmit handler when the user clicks the hex color input submit button.
        document.getElementById('hex-color-picker-submit').addEventListener('click', hexColorSubmitHandler);
    };

    TokenArtifactView.prototype._initState = function (state) {
        this._super._initState.call(this._super, state);

        this._state.view.metadata.title = state.urlQuerystrings.title;
        this._state.view.metadata.ipfsUrl = state.urlQuerystrings.ipfs;
        this._state.view.metadata.windowed = state.urlQuerystrings.windowed === 'true';
        this._state.view.metadata.issuer = {
            name: state.urlQuerystrings.issuer,
        };

        this._state.view.metadata.type = state.urlQuerystrings.mime;
    }

    TokenArtifactView.prototype._fitContentToFooter = function() {
        return false;
        var windowHeight = window.innerHeight;
        var footerHeight = document.getElementById('token-view-content-nav').offsetHeight;

        document.getElementById('token-view-content').style.height = (windowHeight - footerHeight) + 'px';
    };

    /**
     * Open or close the color picker menu.
     * @param {Boolean} shouldOpen Flag to determine if the color picker menu should be opened or closed.
     */
    TokenArtifactView.prototype._toggleColorPickerMenu = function (shouldOpen) {
        // Update the flag keeping track of the menu's open state.
        this._state.view.metadata.colorMenuOpen = shouldOpen;

        /**
         * Gather the color picker and hex color input elements and either hide or reveal them
         * depending on the given open state of the menus.
         */

        var menuClassList = document.getElementById('bg-color-picker-menu').classList;
        var hexColorPickerClassList = document.getElementById('hex-color-picker-container').classList;

        shouldOpen ? menuClassList.remove('hidden') : menuClassList.add('hidden');
        shouldOpen ? hexColorPickerClassList.remove('hidden') : hexColorPickerClassList.add('hidden');
    };

    window.TokenArtifactView = TokenArtifactView;
})();