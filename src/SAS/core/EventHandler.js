/**
 * Created by ycui on 8/13/14.
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    var PEN = 'pen';
    var MOUSE = 'mouse';
    var TOUCH = 'touch';
    /**
     * @class: SAS.EventHandler
     */
    SAS.EventHandler = function (canvas) {
        var _events = {};
        var _init = function () {

        };

        this.raiseEvent = function (eventName, args) {
            var callbacks = _events[eventName];
            if (!callbacks) return;
            for (var i = 0, l = callbacks.length; i < l; i++) {
                callbacks[i].apply(null, args);
            }
        };

        this.removeListener = function (eventName) {
            delete _events[eventName];
        };

        this.addListener = function (eventName, callback) {
            var callbacks = _events[eventName] = _events[eventName] || [];
            callbacks.push(callback);
        };

        _init();
    };
})();