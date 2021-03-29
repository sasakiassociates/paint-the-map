/**
 * User: kgoulding
 * Date: 2/14/14
 * Time: 11:29 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.PaintBucket
     **/
    SAS.PaintBucket = function (canvas, ctx, drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight) {
        //https://github.com/williammalone/HTML5-Paint-Bucket-Tool/blob/master/html5-canvas-paint-bucket.js

        var _self = this;

        //region private fields and methods
        var _canvas = canvas;
        var _ctx = ctx;

        var _curColor = {r: 0, g: 0, b: 0};
        var _paintColor;
        var _cancelFillOperation = false;

        var colorLayerData;
        var _canvasWidth;
        var _canvasHeight;

        var _fillToCornersAllowed = false;

        var _drawingBoundLeft = drawingAreaX || 0;
        var _drawingBoundTop = drawingAreaY || 0;

        var _matchStartColor = function (pixelPos) {

            var r = colorLayerData.data[pixelPos];
            var g = colorLayerData.data[pixelPos + 1];
            var b = colorLayerData.data[pixelPos + 2];
            var a = colorLayerData.data[pixelPos + 3];

            // If the current pixel matches the clicked color
            return (a === _curColor.a && r === _curColor.r && g === _curColor.g && b === _curColor.b);
        };

        var _floodFill = function (startX, startY, startR, startG, startB) {
            var newPos;
            var x;
            var y;
            var pixelPos;
            var reachLeft;
            var reachRight;

            var _drawingBoundRight = _drawingBoundLeft + _canvasWidth - 1;
            var _drawingBoundBottom = _drawingBoundTop + _canvasHeight - 1;

            var pixelStack = [
                [startX, startY]
            ];

            var safety = 10000000;//prevent getting stuck in a loop

            while (pixelStack.length && !_cancelFillOperation && --safety > 0) {

                newPos = pixelStack.pop();
                x = newPos[0];
                y = newPos[1];

                // Get current pixel position
                pixelPos = (y * _canvasWidth + x) * 4;

                // Go up as long as the color matches and are inside the canvas
                while (y >= _drawingBoundTop && _matchStartColor(pixelPos) && --safety > 0) {
                    y -= 1;
                    pixelPos -= _canvasWidth * 4;
                }

                pixelPos += _canvasWidth * 4;
                y += 1;
                reachLeft = false;
                reachRight = false;

                // Go down as long as the color matches and in inside the canvas
                while (y <= _drawingBoundBottom && _matchStartColor(pixelPos) && !_cancelFillOperation && --safety > 0) {

                    y += 1;

                    colorPixel(pixelPos, _paintColor.r, _paintColor.g, _paintColor.b, _paintColor.a);

                    if (x > _drawingBoundLeft) {
                        if (_matchStartColor(pixelPos - 4)) {
                            if (!reachLeft) {
                                // Add pixel to stack
                                pixelStack.push([x - 1, y]);
                                reachLeft = true;
                            }
                        } else if (reachLeft) {
                            reachLeft = false;
                        }
                    }

                    if (x < _drawingBoundRight) {
                        if (_matchStartColor(pixelPos + 4)) {
                            if (!reachRight) {
                                // Add pixel to stack
                                pixelStack.push([x + 1, y]);
                                reachRight = true;
                            }
                        } else if (reachRight) {
                            reachRight = false;
                        }
                    }

                    pixelPos += _canvasWidth * 4;
                }
            }
        };

        var colorPixel = function (pixelPos, r, g, b, a) {
            if (!_fillToCornersAllowed) {
                if (pixelPos === 0) {
                    _cancelFillOperation = true;
                    return;
                }

            }
            colorLayerData.data[pixelPos] = r;
            colorLayerData.data[pixelPos + 1] = g;
            colorLayerData.data[pixelPos + 2] = b;
            colorLayerData.data[pixelPos + 3] = a !== undefined ? a : 255;
        };

        // Start painting with paint bucket tool starting from pixel specified by startX and startY
        var _paintAt = function (startX, startY) {

            var pixelPos = (startY * _canvasWidth + startX) * 4,
                r = colorLayerData.data[pixelPos],
                g = colorLayerData.data[pixelPos + 1],
                b = colorLayerData.data[pixelPos + 2],
                a = colorLayerData.data[pixelPos + 3];

            _curColor = {a: a, r: r, g: g, b: b};

            if (a === _paintColor.a && r === _paintColor.r && g === _paintColor.g && b === _paintColor.b) {
                // Return because trying to fill with the same color
                _cancelFillOperation = true;
                return;
            }

            _floodFill(startX, startY);
        };

        //endregion

        //region protected fields and methods (use '_' to differentiate).
        //this._getFoo = function() { ...
        //endregion

        //region public API
        this.paintAt = function (color, x, y) {
            _cancelFillOperation = false;
            x = Math.round(x);
            // noinspection JSSuspiciousNameCombination
            y = Math.round(y);
            _canvasWidth = _canvas.width;
            _canvasHeight = _canvas.height;

            _paintColor = color;
            if (_paintColor.a === undefined) _paintColor.a = 255;
            colorLayerData = _ctx.getImageData(0, 0, _canvasWidth, _canvasHeight);
            _paintAt(x, y);

            if (_cancelFillOperation) return false;
            _ctx.putImageData(colorLayerData, 0, 0);
            return true;
        };
        //endregion
    }
})();