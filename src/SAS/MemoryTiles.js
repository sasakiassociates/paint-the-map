/**
 * User: kgoulding
 * Date: 2/14/14
 * Time: 8:49 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.MemoryTiles
     **/
    SAS.MemoryTiles = function (minZoom, maxZoom, tileSize) {
        const _self = this;

        //region private fields and methods
        const _eventHandler = new SAS.EventHandler();

        const _minZoom = minZoom;
        const _maxZoom = maxZoom;
        const _tileSize = tileSize || 256;

        const _undoRedoStates = new SAS.UndoRedoManager();

        const _tilesByAddress = {};
        let _blankCanvasStr;

        const _init = function () {
            //using this trick to quickly identify blank canvas without pixel-level inspection
            //https://stackoverflow.com/questions/17386707/how-to-check-if-a-canvas-is-blank
            const blank = document.createElement('canvas');
            blank.width = _tileSize;
            blank.height = _tileSize;
            _blankCanvasStr = blank.toDataURL();

        };

        const _createCanvasTile = function (x, y, zoom) {
            const canvas = document.createElement('canvas');
            canvas.width = _tileSize;
            canvas.height = _tileSize;
            return {
                x: x,
                y: y,
                zoom: zoom,
                currentData: '',
                canvas: canvas,
                ctx: canvas.getContext("2d")
            };
        };

        const _disableSmoothing = function (ctx) {
            ctx.mozImageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;
            ctx.imageSmoothingEnabled = false;
        };

        const _clearCanvas = function (canvas) {
            // console.count('_clearCanvas');
            // noinspection SillyAssignmentJS
            canvas.width = canvas.width;
        };

        const _copyToTile = function (sourceMemoryTile, memoryTile, clearAll, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH) {
            if (clearAll) {
                _clearCanvas(memoryTile.canvas);
            } else {
                memoryTile.ctx.clearRect(dstX, dstY, dstW, dstH);
            }
            _disableSmoothing(memoryTile.ctx);
            memoryTile.ctx.drawImage(sourceMemoryTile.canvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);

            // console.count('memoryTile.canvas.toDataURL');

            const rawData = memoryTile.canvas.toDataURL();
            if (rawData !== memoryTile.currentData) {//rawData !== _blankCanvasStr
                memoryTile.currentData = rawData;
                _eventHandler.raiseEvent('tileUpdate', [memoryTile]);
                return true;
            }
            return false;
        };

        const _drawOtherZoomLevelsIn = function (x, y, zoom, sourceMemoryTile) {
            if (zoom > _maxZoom) return;
            // console.log('======= ZOOM ' + zoom, x, y);

            const sides = 2;
            const tileSize = _tileSize / 2;
            for (let tx = 0; tx < sides; tx++) {
                for (let ty = 0; ty < sides; ty++) {
                    const tileAddress = (x + tx) + '_' + (y + ty) + '_' + zoom;
                    let memoryTile = _tilesByAddress[tileAddress];
                    if (!memoryTile) memoryTile = _tilesByAddress[tileAddress] = _createCanvasTile(x + tx, y + ty, zoom);

                    if (_copyToTile(sourceMemoryTile, memoryTile, true, tx * tileSize, ty * tileSize, tileSize, tileSize, 0, 0, _tileSize, _tileSize)) {
                        _drawOtherZoomLevelsIn((x + tx) * 2, (y + ty) * 2, zoom + 1, memoryTile);
                    }
                }
            }
            // console.log('/======= ZOOM...');
        };

        const _drawOtherZoomLevelsOut = function (x, y, zoom, sourceMemoryTile) {
            let xPos = x;
            let yPos = y;
            let xPosFrac = x;
            let yPosFrac = y;
            let tileSize = _tileSize;
            //for further-up zoom levels we draw the full tile, scaled down into a piece of the other tile...
            // + we should clear only a the part of the tile we're drawing
            for (let z = zoom - 1; z >= _minZoom; z--) {
                xPos = Math.floor(xPos / 2);
                yPos = Math.floor(yPos / 2);
                xPosFrac = xPosFrac / 2;
                yPosFrac = yPosFrac / 2;
                tileSize = tileSize / 2;

                const xOffset = _tileSize * (xPosFrac - xPos);
                const yOffset = _tileSize * (yPosFrac - yPos);
                // console.log('======= ZOOM ' + z, xPos, yPos, tileSize, xOffset, yOffset);

                const tileAddress = xPos + '_' + yPos + '_' + z;
                let memoryTile = _tilesByAddress[tileAddress];
                if (!memoryTile) memoryTile = _tilesByAddress[tileAddress] = _createCanvasTile(xPos, yPos, z);
                _copyToTile(sourceMemoryTile, memoryTile, false, 0, 0, _tileSize, _tileSize, xOffset, yOffset, tileSize, tileSize);
                // memoryTile.ctx.drawImage(sourceMemoryTile.canvas, 0, 0, _tileSize, _tileSize, xOffset, yOffset, tileSize, tileSize);
                // console.log('drawImage', tileAddress, 0, 0, _tileSize, _tileSize, xOffset, yOffset, tileSize, tileSize);
            }
        };

        const _drawOtherZoomLevels = function (x, y, zoom, sourceMemoryTile) {
            _drawOtherZoomLevelsIn(x * 2, y * 2, zoom + 1, sourceMemoryTile);
            _drawOtherZoomLevelsOut(x, y, zoom, sourceMemoryTile);
        };

        const _downloadData = function (filename, data) {
            if (!data) {
                console.error('No data');
                return;
            }

            if (!filename) filename = 'console.json';

            if (typeof data === "object") {
                data = JSON.stringify(data, undefined, 4)
            }

            const blob = new Blob([data], {type: 'text/json'});
            const e = document.createEvent('MouseEvents');
            const a = document.createElement('a');

            a.download = filename;
            a.href = window.URL.createObjectURL(blob);
            a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);
        };

        const _serialize = function () {
            const saveData = {tiles: []};
            Object.keys(_tilesByAddress).forEach((k) => {
                const tile = _tilesByAddress[k];
                if (tile.zoom === _maxZoom && tile.currentData.length > 0) {
                    if (tile.currentData !== _blankCanvasStr) {
                        saveData.tiles.push({x: tile.x, y: tile.y, zoom: tile.zoom, data: tile.currentData});
                    }
                }
            });
            return saveData;
        };
        const _deserializeIntoTiles = function (state, create, callback) {
            const stateTilesLookup = {};
            state.tiles.forEach((tile, i) => {
                const tileAddress = tile.x + '_' + tile.y + '_' + tile.zoom;
                stateTilesLookup[tileAddress] = tile;
                if (create && !_tilesByAddress[tileAddress]) {
                    _tilesByAddress[tileAddress] = _createCanvasTile(tile.x, tile.y, tile.zoom);
                }
                // let memoryTile = _tilesByAddress[tileAddress];
                // if (!memoryTile) memoryTile = _tilesByAddress[tileAddress] = _createCanvasTile(x, y, zoom);

            });

            const calls = [];
            Object.keys(_tilesByAddress).forEach((k) => {
                const memoryTile = _tilesByAddress[k];
                if (memoryTile.zoom !== _maxZoom) return;
                const tile = stateTilesLookup[k];
                calls.push((countDown) => {
                    const redrawTile = function (draw) {
                        _clearCanvas(memoryTile.canvas);
                        memoryTile.currentData = _blankCanvasStr;
                        draw();
                        _drawOtherZoomLevels(memoryTile.x, memoryTile.y, memoryTile.zoom, memoryTile);

                        _eventHandler.raiseEvent('tileUpdate', [memoryTile]);
                        countDown();
                    };
                    if (tile) {
                        if (memoryTile.currentData === tile.data) {
                            // console.log(`state tile found: ${k} : no change`);
                            countDown();
                        } else {
                            // console.log(`state tile found: ${k} : change detected, redraw image`);

                            const image = new Image();
                            image.onload = function () {
                                redrawTile(() => {
                                    memoryTile.currentData = tile.data;
                                    // memoryTile.ctx.fillStyle = '#ff00ff';
                                    // memoryTile.ctx.fillRect(0, 0, 50, 50);
                                    memoryTile.ctx.drawImage(image, 0, 0);
                                });
                            };
                            image.src = tile.data;
                        }
                    } else {
                        if (memoryTile.currentData === _blankCanvasStr) {
                            // console.log(`state tile NOT found: ${k} : BLANK`);
                            countDown();
                        } else {
                            // console.log(`state tile NOT found: ${k} : clear memory tile`);

                            redrawTile(() => {
                                // memoryTile.ctx.fillStyle = '#ff9900';
                                // memoryTile.ctx.fillRect(0, 0, 50, 50);
                            });
                        }
                    }
                });
            });


            let cnt = calls.length;
            // console.log(`_deserializeIntoTiles... TOTAL TILES: ${cnt}`);
            calls.forEach((call, i) => {
                call(() => {
                    // console.log(`countDown... ${cnt}`);
                    if (--cnt === 0) {
                        _eventHandler.raiseEvent('tileUpdatesComplete');
                        if (callback) callback();
                    }
                });
            });
        };
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

        this.saveUndoState = function () {
            const state = _serialize();
            _undoRedoStates.add(state);
        };

        this.undo = function () {
            const state = _undoRedoStates.undo();
            if (!state) return;
            _deserializeIntoTiles(state);
        };

        this.redo = function () {
            const state = _undoRedoStates.redo();
            if (!state) return;
            _deserializeIntoTiles(state);
        };

        this.drawFromMemory = function (canvas, x, y, zoom) {
            const tileAddress = x + '_' + y + '_' + zoom;
            if (!_tilesByAddress[tileAddress]) return;
            _clearCanvas(canvas);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(_tilesByAddress[tileAddress].canvas, 0, 0);
        };

        this.drawToMemory = function (x, y, zoom, sCanvas, offsetLeft, offsetTop) {
            const tileAddress = x + '_' + y + '_' + zoom;
            let memoryTile = _tilesByAddress[tileAddress];
            if (!memoryTile) memoryTile = _tilesByAddress[tileAddress] = _createCanvasTile(x, y, zoom);

            //don't clear the part of the canvas that is off-canvas
            const clearRect = {x: 0, y: 0, w: _tileSize, h: _tileSize};

            if (offsetTop < 0) {
                clearRect.y = -offsetTop;
            }
            if (offsetLeft < 0) {
                clearRect.x = -offsetLeft;
            }
            if (offsetLeft + _tileSize > sCanvas.width) {
                clearRect.w = sCanvas.width - offsetLeft;
            }
            if (offsetTop + _tileSize > sCanvas.height) {
                clearRect.h = sCanvas.height - offsetTop;
            }

            if (clearRect.x > 0 || clearRect.y > 0 || clearRect.w < _tileSize || clearRect.h < _tileSize) {
                memoryTile.ctx.clearRect(clearRect.x, clearRect.y, clearRect.w, clearRect.h);
            } else {
                _clearCanvas(memoryTile.canvas);
            }

            memoryTile.ctx.drawImage(sCanvas, -offsetLeft, -offsetTop);

            // console.count('memoryTile.canvas.toDataURL 2');
            const rawData = memoryTile.canvas.toDataURL();
            if (rawData !== memoryTile.currentData || (rawData !== _blankCanvasStr && memoryTile.currentData === '')) {
                memoryTile.currentData = rawData;
                _eventHandler.raiseEvent('tileUpdate', [memoryTile]);
                _drawOtherZoomLevels(x, y, zoom, memoryTile);
            }
        };

        this.withTile = function (x, y, zoom, callback) {
            const tileAddress = x + '_' + y + '_' + zoom;
            let mTile = _tilesByAddress[tileAddress];
            if (!mTile) return;
            callback(mTile, mTile.currentData === _blankCanvasStr);
        };

        this.withTiles = function (zoom, callback) {
            Object.keys(_tilesByAddress).forEach((k) => {
                const tile = _tilesByAddress[k];
                if (tile.zoom === zoom && tile.currentData.length > 0) {
                    if (tile.currentData !== _blankCanvasStr) {
                        callback(tile);
                    }
                }
            });
        };

        this.download = function (filename) {
            const saveData = _serialize();
            _downloadData(filename || 'sketchData.json', JSON.stringify(saveData))
        };

        this.save = function (callback, postEndPoint) {
            postEndPoint = postEndPoint || 'https://13wb5f9l04.execute-api.us-east-1.amazonaws.com/staging';
            const saveData = _serialize();
            // $.post('https://13wb5f9l04.execute-api.us-east-1.amazonaws.com/staging', saveData);
            $.ajax
            ({
                type: 'POST',
                url: postEndPoint,
                dataType: 'json',
                async: false,
                // data: JSON.stringify(saveData),
                data: saveData,
                success: function () {
                    callback(true);
                },
                error: function (err) {
                    callback(false);
                }
            });
        };

        this.loadUrl = function(url, callback) {
            $.getJSON(url, (data) => {
                if (!data.tiles) return;
                //Note sure why x,y and zoom get converted into strings in round-tripping to server... but this converts back
                data.tiles.forEach((tile, i) => {
                    tile.x = +tile.x;
                    tile.y = +tile.y;
                    tile.zoom = +tile.zoom;
                });
                _deserializeIntoTiles(data, true, function () {
                    if (callback) callback();
                });
            });
        }

        this.load = function (data) {
            _deserializeIntoTiles(data, true);
        };

        this.wipe = function () {
            _deserializeIntoTiles({tiles: []});
        };

        //endregion

        _init();
    }
})();
