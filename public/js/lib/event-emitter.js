'use strict';

// EventEmitter Class
(function () {
    function EventEmitter() {
        this._handlers = {};
        this._oneTimeHandlers = {};
    }

    EventEmitter.prototype.on = function (key, handler) {
        this._handlers[key] = this._handlers[key] || [];

        this._handlers[key].push(handler);
    };

    EventEmitter.prototype.once = function (key, handler) {
        this._oneTimeHandlers[key] = this._handlers[key] || [];

        this._oneTimeHandlers[key].push(handler);
    };

    EventEmitter.prototype.emit = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var key = args[0];
        var dataArr = args.slice(1);

        if (this._handlers.hasOwnProperty(key)) {
            for (var i = 0; i < this._handlers[key].length; i++) {
                this._handlers[key][i].apply(this, dataArr);
            }
        }

        if (this._oneTimeHandlers.hasOwnProperty(key)) {
            var handlers = this._oneTimeHandlers[key];

            this._oneTimeHandlers[key] = [];

            for (var i = 0; i < handlers[key].length; i++) {
                handlers[key][i].apply(this, dataArr);
            }
        }
    };

    window.EventEmitter = EventEmitter;
})();