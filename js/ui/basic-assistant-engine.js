(function () {
    function BasicAssistantEngine(state) {
        this._el = document.getElementById('basic-assistant-engine-container');
        this._textContainer = document.getElementById('basic-assistant-engine-output');
        this._avatarContainer = document.getElementById('basic-assistant-engine-avatar-img-wrapper');
        this._buttonContainer = document.getElementById('basic-assistant-engine-button-container');
        this._loadTextTimeout = null;
        this._chatterMap = {
            default: 0,
        };

        this._state = state;

        this._state.eventEmitter.on(Util.eventKeys.WALLET_UNSYNC, function () {
            this.loadAvatar();

            setTimeout(function () {
                this.loadText('Welcome back, DEFAULT_USER!', {
                    wait: 3000
                });   
            }.bind(this), 1000);
        }.bind(this));

        this.loadAvatar();
    }

    BasicAssistantEngine.prototype.confirm = function (str, opts) {
        opts = opts || {};
        opts.disableHide = true;
        opts.confirmCallback = opts.confirmCallback || function () {};
        opts.denyCallback = opts.denyCallback || function () {};

        this._buttonContainer.classList.remove('hidden');

        document.getElementById('basic-assistant-engine-confrim-button').onclick = function () {
            this.hide();
            opts.confirmCallback();
        }.bind(this);

        document.getElementById('basic-assistant-engine-deny-button').onclick = function () {
            document.getElementById('basic-assistant-engine-confrim-button').removeAttribute('onclick');
            document.getElementById('basic-assistant-engine-deny-button').removeAttribute('onclick');
            this.hide();
            opts.denyCallback();
        }.bind(this);

        this.loadText(str, opts);
    };

    BasicAssistantEngine.prototype.loadAvatar = function () {
        var tid = this._state.session.assistant && this._state.session.assistant.avatar && this._state.session.assistant.avatar.tid;
        var ipfsCid = 'QmdpiWPhdcu3PYc2YHQyLSuoF9AnA5F74jDfAWdNJRMmNL';

        if (tid) {
            var addressCollection = this._state.tokens.getCollection(this._state.wallet.getActiveAccount().address);
            var token = addressCollection && addressCollection.tidTokenMap && addressCollection.tidTokenMap[tid];

            if (token) {
                ipfsCid = token.displayArtifactIpfsAddress.substring(7);
            }
        }

        var avatar = document.createElement('img');

        avatar.id = 'basic-assistant-engine-avatar-img';
        avatar.src = this._state.session.defaultGateway + '/ipfs/' + ipfsCid;

        var existingAvatarImg = document.getElementById('basic-assistant-engine-avatar-img');

        existingAvatarImg && existingAvatarImg.remove();
        document.getElementById('basic-assistant-engine-avatar-img-wrapper').appendChild(avatar);
    };

    BasicAssistantEngine.prototype.loadText = function (str, opts) {
        opts = opts || {};

        if ((opts.once || opts.chatter) && !this._shouldLoadChatter(str, opts)) {
            return false;
        }

        this._setSentimentLevel(opts.level);
    
        this._hideAssistantTimeout && clearTimeout(this._hideAssistantTimeout);
        this._loadTextTimeout && clearTimeout(this._loadTextTimeout);

        this._textContainer.innerHTML = '';

        this.reveal();

        setTimeout(function () {
            textLoader.call(this, str);
        }.bind(this), 100);

        function textLoader (str) {
            this._loadTextTimeout && clearTimeout(this._loadTextTimeout);

            if (!str.length) {
                if (opts.disableHide !== true) {
                    this._hideAssistantTimeout = setTimeout(function () {
                        this.hide();

                        if (opts.callback) {
                            opts.callback();
                        }
                    }.bind(this), opts.wait || opts.wait === 0 ? opts.wait : 1750);
                }

                return false;
            }

            var waitTime = 30;

            if (str.substring(1).charAt(0) === '\n') {
                waitTime = 60;
            }

            var char = str.charAt(0);

            if (char === '\n') {
                char = '<br>';
            } else if (char === '[') {
                var bracketCloserIndex = str.indexOf(']');

                if (bracketCloserIndex !== -1) {
                    var urlOpenerIndex = str.indexOf('(');
                    var urlCloserIndex = str.indexOf(')');

                    if (urlOpenerIndex === bracketCloserIndex + 1 && urlCloserIndex !== -1) {
                        var linkText = str.substring(1, bracketCloserIndex);
                        var linkUrl = str.substring(urlOpenerIndex + 1, urlCloserIndex);

                        char = '<a href="' + linkUrl + '">' + linkText + '</a>';
                        str = str.substring(urlCloserIndex);
                    }
                }
            }

            this._textContainer.innerHTML += char;

            this._loadTextTimeout = setTimeout(function () {
                textLoader.call(this, str.substring(1));
            }.bind(this), waitTime);
        }
    };

    BasicAssistantEngine.prototype.hide = function () {
        this._el.classList.add('out-of-view');
        this._buttonContainer.classList.add('hidden');
        this._loadTextTimeout && clearTimeout(this._loadTextTimeout);
        this._hideAssistantTimeout && clearTimeout(this._hideAssistantTimeout);
    };

    BasicAssistantEngine.prototype.reveal = function () {
        this._el.classList.remove('out-of-view');
    };

    BasicAssistantEngine.prototype._setSentimentLevel = function (level) {
        level = level || 30;

        var levelMap = {
            50: 'error',
            40: 'warning',
            30: 'info',
            20: 'debug',
            10: 'trace'
        };

        for (var i = 0; i < Object.values(levelMap).length; i++) {
            this._avatarContainer.classList.remove(Object.values(levelMap)[i]);
        }

        this._avatarContainer.classList.add(levelMap[level]);
    };

    BasicAssistantEngine.prototype._shouldLoadChatter = function (str, opts) {
        var chatterKey = opts.reason || encodeURIComponent(str.toLowerCase());
        var chatterIndex = this._chatterMap[chatterKey];

        if (!chatterIndex) {
            this._chatterMap[chatterKey] = 1;

            return opts.once ? true : _roll();
        } else if (opts.once) {
            // @TODO bind once to localStorage session
            return false;
        } else {
            this._chatterMap[chatterKey]++;
        }

        if (!(chatterIndex % 3)) {
            return _roll();
        }

        function _roll() {
            return !(([0,0,0,0,0].reduce(function (acc) {return acc + Math.round(Math.random())}, 0)) % 2)
        }
    };

    window.BasicAssistantEngine = BasicAssistantEngine;
})();