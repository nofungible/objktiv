(function() {
    var Util = window.Util;

    function Sidebar(state) {
        this._state = state;
        this._isOpen = false;

        this._attachGestureHandlers();
        this._addEventHandlers();
    }

    Sidebar.prototype._attachGestureHandlers = function() {
        var self = this;

        document.getElementById('day-night-toggle').addEventListener('click', function (evt) {
            if (self._state.session.nightModeActive) {
                self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_NIGHT_MODE_DISABLE);
            } else {
                self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_NIGHT_MODE_ENABLE);
            }

            evt.preventDefault();

            return false;
        });

        document.addEventListener('click', function (evt) {
            if (evt.target.id === 'sidebar') {
                return false;
            }

            self.close();
        })

        document.getElementById('sync').addEventListener('click', function () {
            if (self._state.wallet.getActiveAccount().anonymous) {
                self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_WALLET_SYNC);
            } else {
                self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_WALLET_UNSYNC);
            }
        });
    };

    Sidebar.prototype._addEventHandlers = function () {
        this._state.eventEmitter.on(Util.eventKeys.KEY_ESC, this.close.bind(this));

        var self = this;

        // Handle wallet sync
        this._state.eventEmitter.on(Util.eventKeys.WALLET_SYNC, function () {
            self._toggleSyncUI(true);
        });

        // Handle wallet unsync
        this._state.eventEmitter.on(Util.eventKeys.WALLET_UNSYNC, function () {
            self._toggleSyncUI(false);
        });
    
        this._state.eventEmitter.on(Util.eventKeys.DISPATCH_SIDEBAR_TOGGLE, this.toggle.bind(this));
    };

    Sidebar.prototype._toggleSyncUI = function (isSynchronized) {
        if (isSynchronized) {
            document.getElementById('sync').innerText = 'unsync';
            document.getElementById('wallet-nav').classList.remove('hidden');
        } else {
            document.getElementById('sync').innerText = 'sync';
            document.getElementById('wallet-nav').classList.add('hidden');
        }
    }

    Sidebar.prototype.open = function() {
        this._isOpen = true;
        this._isOpening = true;

        setTimeout(() => {
            this._isOpening = false;
        }, 0);

        document.getElementById('sidebar').classList.remove('hidden');
    };

    Sidebar.prototype.close = function() {
        if (this._isOpening) {
            return false;
        }

        this._isOpen = false;

        document.getElementById('sidebar').classList.add('hidden');
    };

    Sidebar.prototype.toggle = function() {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    window.Sidebar = Sidebar;
})();
