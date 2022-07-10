(function () {
    function PopUp(state, popUpElement, title, id) {
        this._title = title;
        this._id = id;
        this._state = state;
        this._popUpElement = popUpElement;

        this._attachGestureHandlers();
        this._addEventHandlers();
    }

    PopUp.prototype._attachGestureHandlers = function () {};
    PopUp.prototype._addEventHandlers = function () {};

    PopUp.prototype.open = function () {
        this._popUpElement.close.call(this._popUpElement);
        this._popUpElement.setHeader.call(this._popUpElement, this._title);
        document.getElementById(this._id).classList.remove('hidden');
        this._popUpElement.open.call(this._popUpElement);
    };

    PopUp.prototype.close = function () {
        this._popUpElement.close.call(this._popUpElement);
    };

    window.PopUp = PopUp;
})();
