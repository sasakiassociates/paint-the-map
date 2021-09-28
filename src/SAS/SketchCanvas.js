/**
 * User: kgoulding
 * Date: 2/14/14
 * Time: 8:49 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
const EVENT_START = 'mousedown';
const EVENT_MOVE = 'mousemove';
const EVENT_STOP = 'mouseup';
(function () { // self-invoking function
    const MARKER = 'marker';
    const ERASER = 'eraser';
    const PAINT_BUCKET = 'paint_bucket';
    const PAINT_ROLLER = 'paint_roller';
    /**
     * @class SAS.SketchCanvas
     **/
    SAS.SketchCanvas = function (canvas, scale, disableUndoRedo) {
        const _self = this;

        //region private fields and methods
        let _onSketchChange = function (canvas, ctx, data) {
        };

        const _eventHandler = new SAS.EventHandler();

        const _canvas = canvas;
        const _scale = scale;
        const _useBrushMarker = true;
        let _$brushMarker;

        let _canvas_coords;
        let _ctx;
        let _drawing;
        let _undoRedo;

        let _floodFillTool;
        let _toolMode = MARKER;
        let _paintColorRaw;
        let _fillStyle;
        let _paintColor;
        let _paintTarget;

        let _alertedAboutPaintBucketUse = false;

        const _brush = {width: 10, height: 10};
        let _pixelUnits = 1;

        let _drawingState;
        let _penState;

        // const _worker = new Worker('js/worker/pixelWork.js');
        // _worker.onmessage = function (e) {
        //     var countData = e.data.result;
        //     _onSketchChange(_canvas, _ctx, countData);
        // };

        const _hexToRGB = function (hex) {
            if (hex === 'empty') {
                return {r: 0, g: 0, b: 0, a: 0};
            }
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        const _trig = {
            distanceBetween2Points: function (point1, point2) {
                const dx = point2.x - point1.x;
                const dy = point2.y - point1.y;
                return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            },

            angleBetween2Points: function (point1, point2) {
                const dx = point2.x - point1.x;
                const dy = point2.y - point1.y;
                return Math.atan2(dx, dy);
            }
        };

        const _init = function () {
            _ctx = _canvas.getContext('2d');
//            _ctx.scale(1 / _scale, 1 / _scale);

            _floodFillTool = new SAS.PaintBucket(_canvas, _ctx);

            _addCanvasEvents();
            if (!disableUndoRedo) {
                _undoRedo = new SAS.ImageUndoRedo(_canvas, _ctx);
            }
            _initPencil();

            if (_useBrushMarker) {
                _$brushMarker = $('<div id="brush-marker">').appendTo('body');
                _self.setBrushSize(10);
            }
        };

        const _initPencil = function () {
            _drawing = false;
        };

        const _addCanvasEvents = function () {
            _penState = new SAS.PenState(_canvas);
            _penState.enable(true);
            _penState.addListener(EVENT_START, _start);
            _penState.addListener(EVENT_STOP, _stop);
            _penState.addListener(EVENT_MOVE, _mouseMove);

        };

        const _updateComplete = function () {
            // const canvasData = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
            _eventHandler.raiseEvent('canvasUpdate');
            // _worker.postMessage({ jobData: canvasData});//will call _onSketchChange async;
        };

        const _getCursorPos = function (position) {
            const x = (position.x - _canvas_coords.left) / _scale;
            const y = (position.y - _canvas_coords.top) / _scale;
            return {x: x, y: y}
        };

        const _toPix = function (number) {
            return number * _pixelUnits;
        };

        const _start = function (state) {
            _canvas_coords = $(_canvas).offset();

            const cPos = _getCursorPos(state.position);

            if (_undoRedo) _undoRedo.saveState();
            _fillStyle = _paintColorRaw;
            if (_toolMode === MARKER || _toolMode === PAINT_BUCKET) {
                _paintColor = _hexToRGB(_paintColorRaw);
            } else {
                _paintColor = {a: 0};
                // _fillStyle = '#ff0000';
                // _paintColor = _hexToRGB(_fillStyle);
                // _paintColor.a = 0.7;
            }
            if (_toolMode === PAINT_BUCKET || ((_toolMode === MARKER || _toolMode === ERASER) && state.ctrlKey)) {
                _drawing = false;
                if (_floodFillTool.paintAt(_paintColor, cPos.x, cPos.y)) {
                    _updateComplete();
                } else {
                    if (!_alertedAboutPaintBucketUse) {
                        alert('The paint bucket fills enclosed areas. Paint around an area with the marker, then click inside to fill.');
                        _alertedAboutPaintBucketUse = true;
                    }
                    if (_undoRedo) _undoRedo.unsaveState();//since nothing actually changed
                }
            } else if (_toolMode === MARKER || _toolMode === ERASER) {
                if (_drawingState && state.shiftKey) {
                    //paint from last point to this point
                    _drawing = true;
                    _stroke(state);
                    _drawing = false;
                    _updateComplete();
                } else {
                    _drawing = true;
                    _drawingState = {x: cPos.x, y: cPos.y}
                }
            } else if (_toolMode === PAINT_ROLLER) {
                if (_paintTarget) {
                    let w, h;
                    const invert = state.ctrlKey;
                    if (_paintTarget.area) {
                        w = h = _toPix(Math.sqrt(_paintTarget.area));
                    } else {
                        w = _toPix((invert) ? _paintTarget.h : _paintTarget.w);
                        h = _toPix((invert) ? _paintTarget.w : _paintTarget.h);
                    }
                    if (_paintTarget.num && state.shiftKey) {
                        w = w * _paintTarget.num;
                    }
                    _drawRect(state, w, h);
                    _updateComplete();
                }
            }

        };

        const _drawRect = function (state, w, h) {
            const position = _getCursorPos(state.position);
            // noinspection JSSuspiciousNameCombination
            _ctx.fillRect(Math.round(position.x), Math.round(position.y), Math.round(w), Math.round(h));
        };

        const _mouseMove = function (state) {
            if (_drawing && _paintColor) {
                _stroke(state);
            }
            if (_useBrushMarker) {
                if (_toolMode === MARKER || _toolMode === ERASER) {
                    _$brushMarker.show().css({
                        left: state.position.x - (1 + _brush.width / 2),
                        top: state.position.y - (1 + _brush.height / 2)
                    });
                } else {
                    _$brushMarker.hide();
                }
            }
        };

        const _stroke = function (state) {
            _ctx.fillStyle = _fillStyle;
            const cPos = _getCursorPos(state.position);

            const eraserMode = state.altKey;

            const halfBrushW = _brush.width / 2;
            const halfBrushH = _brush.height / 2;

            const distance = parseInt(_trig.distanceBetween2Points(_drawingState, cPos));
            const angle = _trig.angleBetween2Points(_drawingState, cPos);

            let x, y;

            for (let z = 0; (z <= distance || z === 0); z++) {
                x = Math.round(_drawingState.x + (Math.sin(angle) * z) - halfBrushW);
                y = Math.round(_drawingState.y + (Math.cos(angle) * z) - halfBrushH);

                if (eraserMode || _paintColor.a === 0) {
                    _ctx.clearRect(x, y, _brush.width, _brush.height);
                } else {
                    _ctx.fillRect(x, y, _brush.width, _brush.height);
                }
            }

            _drawingState = cPos;
        };

        const _stop = function () {
            if (_drawing) {
                _drawing = false;
                _updateComplete();
                // _penState.removeListener(EVENT_MOVE);
            }
        };

        const _clearCanvas = function () {
            // noinspection SillyAssignmentJS
            _canvas.width = _canvas.width; //an alternative way to reset the canvas since clearRect does not work reliably
            //ctx.clearRect(0, 0, $canvas.width(), $canvas.height());
        };

        //endregion

        //region protected fields and methods (use '_' to differentiate).
        //this._getFoo = function() { ...
        //endregion

        //region event methods
        this.removeListener = function (eventName) {
            _eventHandler.removeListener(eventName);
        };

        this.addListener = function (eventName, callback) {
            _eventHandler.addListener(eventName, callback);
        };
        //endregion

        //region public API


        this.resetImageData = function () {
            _clearCanvas();
            _updateComplete();
        };

        this.loadImageData = function (data) {
            const img = new Image();
            img.src = data;
            _clearCanvas();
            const ctx = _canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            _updateComplete();
        };

        this.getCanvas = function () {
            return _canvas;
        };


        this.getToolMode = function () {
            return _toolMode;
        };
        this.setTool = function (tool) {
            _toolMode = tool;
            if (_useBrushMarker) {
                if (_toolMode === ERASER) {
                    _$brushMarker.show();
                    _$brushMarker.css('borderColor', '#ffffff');
                    _$brushMarker.css('borderStyle', 'dotted');
                    _$brushMarker.css('borderWidth', '1px');
                } else if (_toolMode === MARKER) {
                    _$brushMarker.show();
                    _$brushMarker.css('borderColor', _paintColorRaw);
                    _$brushMarker.css('borderStyle', 'solid');
                    _$brushMarker.css('borderWidth', '1px');
                } else {
                    _$brushMarker.hide();
                }
            }
            return _self;
        };

        this.setBrushSize = function (size) {
            _brush.width = size;
            _brush.height = size;

            if (_useBrushMarker) {
                _$brushMarker.css({
                    width: _brush.width,
                    height: _brush.height
                });
            }
            return _self;
        };

        this.undo = function () {
            if (!_undoRedo) throw 'UndoRedo not enabled';
            _undoRedo.undo();
            _updateComplete();
        };
        this.redo = function () {
            if (!_undoRedo) throw 'UndoRedo not enabled';
            _undoRedo.redo();
            _updateComplete();
        };

        /**
         * @param {Function} fn
         */
        this.onSketchChange = function (fn) {
            _onSketchChange = fn;
        };

        this.setPaintColor = function (color, target) {
            _paintColorRaw = color;
            _paintColor = _hexToRGB(color);
            _paintTarget = target;
            _ctx.fillStyle = _paintColorRaw;
        };

        this.setData = function (data) {
            _pixelUnits = data.imageScale.pixelUnits;
        };

        this.enableCanvas = function (enable) {
            _penState.enable(enable);
        };

        this.canvas = function () {
            return _canvas;
        };
        this.paintColorRgb = function () {
            return _paintColor;
        };
        //endregion

        _init();
    }
})();
