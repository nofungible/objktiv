(function() {
    /**
     * View is the parent class for all other page views.
     * Sets shared view parameters and applies generic wallet view preferences.
     */

    function View(state) {
        this._state = state;

        this._initState(state);
    }

    /**
     * Apply wallet/default view preferences tyat are applicable to all views.
     */
    View.prototype._applySessionPreferences = function() {
        if (!this._state.session) {
            throw new Error('Applying session preferences but no session exists');
        }

        /**
         * Apply user's night mode preference.
         */
    
        this._toggleNightMode(this._state.session.nightModeActive);
    }

    View.prototype._addEventHandlers = function () {
        var self = this;

        // Apply necessary UI transformations when night mode is toggled on/off
        this._state.eventEmitter.on(Util.eventKeys.NIGHT_MODE_ENABLED, function () {
            self._toggleNightMode(true);
        });

        this._state.eventEmitter.on(Util.eventKeys.NIGHT_MODE_DISABLED, function () {
            self._toggleNightMode(false);
        });

        // Handle wallet sync
        this._state.eventEmitter.on(Util.eventKeys.WALLET_SYNC, function () {
            self._applySessionPreferences();
        });

        // Handle wallet unsync
        this._state.eventEmitter.on(Util.eventKeys.WALLET_UNSYNC, function () {
            self._clearContent();
            self._applySessionPreferences();
        });
    };

    View.prototype._attachGestureHandlers = function () {
        // Navigate back to the home page when the user clicks the title logo.
        document.getElementById('title').addEventListener('click', Util.navigateHome);

        var self = this;

        // Toggle the sidebar open and close with the hamburger menu icon.
        document.getElementById('sidebar-toggle').addEventListener('click', function (evt) {
            self._state.eventEmitter.emit(Util.eventKeys.DISPATCH_SIDEBAR_TOGGLE);
        });
    };

    View.prototype._clearContent = function () {
        document.getElementById('main-content').innerHTML = '';
    };

    View.prototype._initState = function (state) {
        this._state = state;
    };

    View.prototype._toggleNightMode = function (isNightMode) {
        if (isNightMode) {
            document.body.classList.add('night');
        } else {
            document.body.classList.remove('night');
        }
    };

    View.prototype.render = function () {
        this._applySessionPreferences();
        this._addEventHandlers();
        this._attachGestureHandlers();
    };

    window.View = View;
})();