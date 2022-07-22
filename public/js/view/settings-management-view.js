(function () {
    var Util = window.Util;
    var View = window.View;

    function SettingsManagementView(state) {
        Util.addSuper(this, View);
        View.call(this, state);
    }

    SettingsManagementView.prototype = Object.create(View.prototype);

    SettingsManagementView.prototype._addEventHandlers = function () {
        this._super._addEventHandlers();

        this._state.eventEmitter.on(Util.eventKeys.SESSION_SAVE, function (newSession) {
            this._state.session = newSession;

            document.getElementById('selected-gateway').innerText = this._state.session.defaultGateway;

            this.setExportText();
            this.setAvatarText();
        }.bind(this));
    };

    SettingsManagementView.prototype._attachGestureHandlers = function () {
        this._super._attachGestureHandlers();

        var selectedGateway = document.getElementById('selected-gateway');
        var gatewayOptionsContainer = document.getElementById('gateway-select-options-container');

        selectedGateway.addEventListener('click', function (evt) {
            if (gatewayOptionsContainer.classList.contains('hidden')) {
                gatewayOptionsContainer.classList.remove('hidden');
            } else {
                gatewayOptionsContainer.classList.add('hidden');
            }

            evt.stopPropagation();
        });

        var settingsInput = document.getElementById("settings-import-input");

        settingsInput.addEventListener('input', function() {
            var importSubmit = document.getElementById('settings-import-submit').getElementsByClassName('bracket-button').item(0);

            if (settingsInput.innerText) {
                importSubmit.classList.remove('disabled');
            } else {
                importSubmit.classList.add('disabled');
            }
        });

        var self = this;

        // Import settings from the user when the user clicks the settings import button.
        document.getElementById('settings-import-submit').addEventListener('click', function(evt) {
            // @TODO don't rely on class lists for this. store in state
            if (document.getElementById('settings-import-submit').getElementsByClassName('bracket-button').item(0).classList.contains('disabled')) {
                return false;
            }

            var resetInput = function () {
                document.getElementById("settings-import-input").innerText = '';

                var importSubmit = document.getElementById('settings-import-submit').getElementsByClassName('bracket-button').item(0);

                importSubmit.classList.add('disabled');
            };

            this._state.assistant.confirm(
                'Are you sure you want me to try to import this settings hash?'
                    + '\n\nIf it\'s successful it will replace all of your current settings, including your galleries!'
                , {
                    confirmCallback: function () {
                        resetInput();

                        var ciphertext = document.getElementById('settings-import-input').innerText;
                        var settings;

                        try {
                            settings = Util.decrypt(ciphertext);

                            if (typeof settings !== 'object' || Array.isArray(settings)) {
                                throw new Error('Settings not an object');
                            }
                        } catch (err) {
                            console.error('Settings import input not valid settings', err);

                            settings = null;
                        }

                        if (settings) {
                            self._state.eventEmitter.emit(
                                Util.eventKeys.DISPATCH_SESSION_SAVE, self._state.wallet.getActiveAccount().address, settings
                            );
                        }
                    },
                    denyCallback: function () {
                        resetInput();
                    }
                }
            );
        }.bind(this));

        // Copy the users settings to their clipboard when they click the settings export button.
        document.getElementById('settings-export-submit').addEventListener('click', function() {
            var exportTextElement = document.getElementById('settings-export-text');

            exportTextElement.focus();

            var exportText = exportTextElement.innerText;

            Util.copyToClipboard(exportText);

            this._state.assistant.loadText('Settings hash copied to clipboard!');
        }.bind(this));

        document.getElementById('assistant-avatar-reset-submit').addEventListener('click', function () {
            this._state.assistant.confirm('Are you sure you want to set my avatar back to DEFAULT?', {
                confirmCallback: function() {
                    this._state.session.assistant.avatar.tid = null;

                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);
                    this._state.assistant.loadAvatar();

                    setTimeout(function () {
                        this._state.assistant.loadText('Avatar set back to DEFAULT!');
                    }.bind(this), 500);
                }.bind(this),
            });
        }.bind(this));
    };

    SettingsManagementView.prototype.render = function () {
        this._super.render();

        document.getElementById('selected-gateway').innerText = this._state.session.defaultGateway;

        this.renderGatewayList();
        this.setExportText();
        this.setAvatarText();

        if (!this._state.wallet.getActiveAccount().anonymous) {
            var authenticatedSettings = document.getElementsByClassName('authenticated-settings-item');

            for (var i = 0; i < authenticatedSettings.length; i++) {
                authenticatedSettings[i].classList.remove('hidden');
            }
        }

        document.getElementById('settings-management-view').classList.remove('hidden');
    }

    SettingsManagementView.prototype.setAvatarText = function () {
        var tid = this._state.session.assistant
            && this._state.session.assistant.avatar    
            && this._state.session.assistant.avatar.tid;

        if (!tid) {
            document.getElementById('assistant-avatar-title').innerText = 'DEFAULT';

            document.getElementById('assistant-avatar-title').classList.add('disabled');
            document.getElementById('assistant-avatar-reset-submit').classList.add('hidden');
            document.getElementById('assistant-avatar-view-submit').classList.add('hidden');
            document.getElementById('assistant-avatar-view-submit').href = '#';

            return false;
        }

        var token = this._state.tokens.getCollection(this._state.wallet.getActiveAccount().address).tidTokenMap[tid];

        if (!token) {
            console.error('Token not found for assistant avatar TID - setting assistant avatar to default', tid);

            this._state.session.assistant.avatar.tid = null;
            this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);
            document.getElementById('assistant-avatar-title').innerText = 'DEFAULT';

            document.getElementById('assistant-avatar-title').classList.add('disabled');
            document.getElementById('assistant-avatar-reset-submit').classList.add('hidden');
            document.getElementById('assistant-avatar-view-submit').classList.add('hidden');
            document.getElementById('assistant-avatar-view-submit').href = '#';

            return false;
        }

        document.getElementById('assistant-avatar-title').innerText = Util.truncateString(token.name, 25);
        document.getElementById('assistant-avatar-view-submit').href = this._state.session.defaultGateway + '/ipfs/' + token.displayArtifactIpfsAddress.substring(7);

        document.getElementById('assistant-avatar-title').classList.remove('disabled');
        document.getElementById('assistant-avatar-reset-submit').classList.remove('hidden');
        document.getElementById('assistant-avatar-view-submit').classList.remove('hidden');
    };

    SettingsManagementView.prototype.setExportText = function () {
        document.getElementById('settings-export-text').innerText = Util.encrypt(this._state.session);
    };

    SettingsManagementView.prototype.renderGatewayList = function () {
        var gatewayOptionsContainer =  document.getElementById('gateway-select-options-container');
        var selectedGateway = document.getElementById('selected-gateway');

        document.addEventListener('click', function () {
            gatewayOptionsContainer.classList.add('hidden');
        });

        for (var i = 0; i < this._state.session.gatewayList.length; i++) {
            var el = document.createElement('div');

            el.classList.add('gateway-select-option', 'interactive');

            var gatewayUrl = this._state.session.gatewayList[i];

            el.setAttribute('data-gateway-url', gatewayUrl);

            el.innerText = gatewayUrl;

            (function (gatewayUrl) {
                el.addEventListener('click', function () {
                    selectedGateway.innerText = gatewayUrl;
                    this._state.session.defaultGateway = gatewayUrl;
    
                    this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SESSION_SAVE, this._state.wallet.getActiveAccount().address, this._state.session);
    
                    this._state.assistant.loadText('Default IPFS gateway updated!\n\nFrom now on I\'ll fetch token artifacts from\n' + gatewayUrl);

                    gatewayOptionsContainer.classList.add('hidden');
                }.bind(this));
            }.bind(this))(gatewayUrl);

            gatewayOptionsContainer.appendChild(el);
        }
    };

    window.SettingsManagementView = SettingsManagementView;
})();