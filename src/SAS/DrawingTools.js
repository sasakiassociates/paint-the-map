/**
 * User: kgoulding
 * Date: 2/22/14
 * Time: 12:13 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    const DRAW_MARKER = 'marker';
    const ZOOM_PAN = 'zoomPan';
    const ERASER = 'eraser';
    const PAINT_BUCKET = 'paint_bucket';//Note: constants replicated in @see SAS.SketchCanvas
    /**
     * @class SAS.DrawingTools
     **/
    SAS.DrawingTools = function (undoRedo, load, save, newDoc, options) {
        const _self = this;

        //region private fields and methods
        let _undoRedo = undoRedo;

        let _activeSketch;
        let _toolMode = 'marker';
        let _activeColor = '#ff0000';
        let _$toolbar;
        let _brushSize;
        const _load = load;
        const _save = save;
        const _newDoc = newDoc;
        let _$brushSlider;
        const _elementHandles = {};

        const _options = $.extend({brushSlider: true, undoRedoOrderReversed:true}, options);

        const _addTool = function (id, title, fn) {
            const $tool = $('<div class="tool-button-titled">').appendTo(_$toolbar).attr('id', id).click(fn);
            $('<div class="tool-label">').text(title).appendTo($tool);
            $('<div class="tool-button">').addClass(id).appendTo($tool);
            return $tool;
        };
        const _selectClicked = function ($btn) {
            $('.toggle-btn').find('.tool-button').removeClass('toggle-btn-highlight');
            $btn.find('.tool-button').addClass('toggle-btn-highlight');
        };

        const _setTool = function (tool) {
            _toolMode = tool;
            if (_activeSketch && _activeSketch.setTool) _activeSketch.setTool(tool);
            if (_activeSketch && _activeSketch.canvas) {
                $(_activeSketch.canvas()).toggle(_toolMode !== ZOOM_PAN);
            }

        };

        const _init = function () {
            _$toolbar = $('<div id="toolbar"></div>').appendTo('body');
            $(document).keypress(function (event) {
                const charStr = String.fromCharCode(event.which);
                if (charStr === '=') {
                    _incrementBrushSlider(1);
                }
                if (charStr === '-') {
                    _incrementBrushSlider(-1);
                }
            });

            _$toolbar = $('#toolbar');

            _addTool('zoomPan', 'zoom / pan', function () {
                _setTool(ZOOM_PAN);
                _selectClicked($(this));
            }).addClass('toggle-btn').click();

            _addTool('marker', 'draw', function () {
                _setTool(DRAW_MARKER);
                _selectClicked($(this));
            }).addClass('toggle-btn');

            _addTool('paint_bucket', 'fill area', function () {
                _setTool(PAINT_BUCKET);
                _selectClicked($(this));
            }).addClass('toggle-btn');

            _addTool('eraser', 'eraser', function () {
                _setTool(ERASER);
                _selectClicked($(this));
            }).addClass('toggle-btn');

            if (_undoRedo) {
                const addUndo = function () {
                    _addTool('undo', 'undo', function () {
                        _undoRedo.undo();
                    }).addClass('non-toggle-btn');
                }
                const addRedo = function () {
                    _addTool('redo', 'redo', function () {
                        _undoRedo.redo();
                    }).addClass('non-toggle-btn');
                }
                if (_options.undoRedoOrderReversed) {
                    addRedo();
                    addUndo();
                } else {
                    addUndo();
                    addRedo();
                }



            }

            if (_newDoc) {
                _addTool('new', 'clear', function () {
                    _newDoc();
                }).addClass('non-toggle-btn');
            }

            if (_save) {
                _addTool('save', 'save', function () {
                    _save();
                }).addClass('non-toggle-btn');
            }

            if (_load) {
                _addTool('load', 'load', function () {
                    _load();
                }).addClass('non-toggle-btn');
            }

            _brushSize = _options.brushSize || 10;

            if (_options.brushSlider) {
                const $brushSizeSel = $('<div class="brush-size-selector">').appendTo(_$toolbar);
                const $brushSizeIndicator = $('<div class="brush-size-indicator">').appendTo($brushSizeSel);
                _elementHandles.$brushSizeIndicator = $brushSizeIndicator;
                $brushSizeIndicator.css('background', _activeColor);
                $brushSizeIndicator.css({width: _brushSize, height: _brushSize});
                _$brushSlider = $('<div class="brush-size-slider">').prependTo($brushSizeSel).slider({
                    range: "min",
                    value: _brushSize,
                    min: 3,
                    max: 10
                }).bind('slidechange', function (event, ui) {
                    _brushSize = ui.value;
                    $brushSizeIndicator.css({width: _brushSize, height: _brushSize});
                    if (_activeSketch && _activeSketch.setBrushSize) _activeSketch.setBrushSize(_brushSize);
                }).bind('slide', function (event, ui) {
                    _brushSize = ui.value;
                    $brushSizeIndicator.css({width: _brushSize, height: _brushSize});
                });
            }

            let tempTool;
            $(document).keydown(function (e) {
                if (e.which === 32 && !tempTool) {//SPACE BAR
                    console.log('SWITCH TO PAN, store: ' + tempTool);
                    tempTool = _toolMode;
                    $('#zoomPan').click();
                }
            });
            $(document).keyup(function (e) {
                if (tempTool) {
                    console.log('SWITCH BACK TO: ' + tempTool);
                    $('#' + tempTool).click();
                }
                tempTool = false;
            });

//            $('.ui-slider-handle').height(50);
        };

        var _incrementBrushSlider = function (number) {
            _$brushSlider.slider("value", _brushSize + number);
        };

        //endregion

        //region protected fields and methods (use '_' to differentiate).
        //this._getFoo = function() { ...
        //endregion

        //region public API

        this.setActiveSketch = function (sketch) {
            _activeSketch = sketch;
            if (_activeSketch && _activeSketch.canvas) {
                $(_activeSketch.canvas()).toggle(_toolMode !== ZOOM_PAN);
            }
        };

        this.setPaintColor = function (color) {
            _activeColor = color;
            if (_elementHandles.$brushSizeIndicator) {
                _elementHandles.$brushSizeIndicator.css('background', _activeColor);
            }
        };

        this.setEnabled = function (toolStates) {
            let activeMode = _toolMode;
            Object.keys(toolStates).forEach((k) => {
                if (activeMode === k && !toolStates[k]) {
                    activeMode = null;//currently selected tool becomes deactivated
                }
                $('#' + k).toggle(toolStates[k]);
            });
            if (!activeMode) {
                $('#zoomPan').click();
            }
        };
        //endregion

        _init();
    }
})();
