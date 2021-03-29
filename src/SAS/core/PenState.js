/**
 * Created by ycui on 8/13/14.
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    var PEN = 'pen';
    var MOUSE = 'mouse';
    var TOUCH = 'touch';
    /**
     * @class: SAS.PenState
     */
    SAS.PenState = function (canvas) {
        var _self = this;

        var _events = {};
        var _canvas = canvas;
        var _enabled = false;
        var _eventHandler = new SAS.EventHandler();
        var _init = function () {
            $(_canvas).bind("mousedown touchstart", function (ev) {
                ev.preventDefault();//stop page scrolling
                var state = _getState(ev);
                _raiseEvent("mousedown", [state]);
            });

            $(_canvas).bind("mousemove touchmove", function (ev) {
                ev.preventDefault();//stop page scrolling
                var state = _getState(ev);
                _raiseEvent("mousemove", [state]);
            });

            $(_canvas).bind("mouseup touchend", function (ev) {
                _raiseEvent("mouseup");
            });
        };

        var _raiseEvent = function (eventName, args) {
            if (!_enabled) return;
            _eventHandler.raiseEvent(eventName, args);
        };

        var _getState = function (ev) {
            var plugin = document.getElementById('wtPlugin');
            if (plugin && plugin.penAPI) {
                var penAPI = plugin.penAPI;
                return {
                    position: {
                        x: (ev.pageX?ev.pageX : ev.clientX + document.body.scrollLeft),
                        y: (ev.pageY?ev.pageY : ev.clientY + document.body.scrollTop )
                    },
                    pressure: penAPI.pressure,
                    device: PEN,
                    eraserMode: penAPI.isEraser
                };
            } else if(ev.changedTouches) {
                var touch = ev.changedTouches[0];
                return {
                    position: {
                        x: (touch.pageX?touch.pageX : touch.clientX + document.body.scrollLeft),
                        y: (touch.pageY?touch.pageY : touch.clientY + document.body.scrollTop )
                    },
                    pressure: 1,
                    device: TOUCH,
                    eraserMode: false
                }
            } else {
                return {
                    position: {
                        x: (ev.pageX?ev.pageX : ev.clientX + document.body.scrollLeft),
                        y: (ev.pageY?ev.pageY : ev.clientY + document.body.scrollTop )
                    },
                    pressure: 1,
                    device: MOUSE,
                    eraserMode: false,
                    ctrlKey: ev.ctrlKey,
                    shiftKey: ev.shiftKey
                }
            }
        };

        //region event methods
        this.removeListener = function (eventName) {
            _eventHandler.removeListener(eventName);
        };

        this.addListener = function (eventName, callback) {
            _eventHandler.addListener(eventName, callback);
        };
        //endregion

        this.enable = function (enable) {
            _enabled = enable;
            if (enable) {
                $(_canvas).removeClass("hide-canvas");
            } else {
                $(_canvas).addClass("hide-canvas");
            }
        };

        _init();
    };
})();