// PopUpElement Class
(function () {
    function PopUpElement(state) {
        this._state = state;

        this._containerElement = document.getElementById('pop-up-container');
        this._headerElement = document.getElementById('pop-up-header-content');
    
        this._attachGestureHandlers();
        this._addEventHandlers();
    }

    PopUpElement.prototype.open = function () {
        this._toggleVisibility(true);
    };

    PopUpElement.prototype.close = function () {
        this._toggleVisibility(false);
        this._clear();
    };

    PopUpElement.prototype.setHeader = function (str) {
        this._headerElement.innerText = str;
    };

    PopUpElement.prototype._addEventHandlers = function () {
        this._state.eventEmitter.on(Util.eventKeys.KEY_ESC, this.close.bind(this));
    };

    PopUpElement.prototype._attachGestureHandlers = function() {
        document.getElementById('pop-up-exit').addEventListener('click', this.close.bind(this));
        document.getElementById('pop-up-exit-overlay').addEventListener('click', this.close.bind(this));
    };

    PopUpElement.prototype._clear = function () {
        this.setHeader('');
        this._hideContent();
    };

    PopUpElement.prototype._hideContent = function () {
        var popUpContentElements = document.getElementsByClassName('pop-up-content');

        for (var i = 0; i < popUpContentElements.length; i++) {
            popUpContentElements[i].classList.add('hidden');
        }
    };

    PopUpElement.prototype._toggleVisibility = function (isVisible) {
        if (isVisible === true) {
            this._containerElement.classList.remove('hidden');
        } else {
            this._containerElement.classList.add('hidden');
        }
    };

    window.PopUpElement = PopUpElement;
})();
