/**
 * User: kgoulding
 * Date: 5/2/2018
 * Time: 11:02 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.PixelMath
     **/
    SAS.PixelMath = function (options) {
        const _self = this;
        const TO_RADIANS = Math.PI / 180.0;
        const TO_DEGREES = 180.0 / Math.PI;

        //region private fields and methods
        const _options = options;
        const _eventHandler = new SAS.EventHandler();
        const _workers = {};

        const MAX_WORKERS = 4;
        const _workersArr = [];

        const _assignWorker = function (num) {
            if (num < MAX_WORKERS) {
                _workersArr.push(_createWorker());
                return _workersArr[_workersArr.length - 1];
            }
            return _workersArr[num % MAX_WORKERS]
        }

        const _createWorker = function () {
            const worker = new Worker(options.pixelWorkFile);
            const workerInfo = {worker, complete: false};
            worker.onmessage = function (e) {
                let countData = (e.data.result.counts) ? e.data.result.counts : e.data.result;
                const hexData = {};
                Object.keys(countData).forEach((k) => {
                    const val = countData[k];
                    const hex = _rgbToHex(val.color);
                    if (options && options.storePositions) {
                        hexData[hex] = {count: val.count, positions:e.data.result.positions[k]};
                    } else {
                        hexData[hex] = val.count;
                    }
                });
                workerInfo.complete = true;
                _eventHandler.raiseEvent('pixelsCounted', [hexData, e.data.metaData]);
            };
            return workerInfo
        };

        const _getPixelsInMeters = (zoom, lat) => {
            return 156543.03 * Math.cos(lat * TO_RADIANS) / Math.pow(2, zoom);
        };

        const _pointToTileFraction = (lat, lon, z) => {
            const d2r = Math.PI / 180;
            const sin = Math.sin(lat * d2r),
                z2 = Math.pow(2, z);
            let x = z2 * (lon / 360 + 0.5);
            const y = z2 * (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);

            // Wrap Tile X
            x = x % z2;
            if (x < 0) x = x + z2;
            return {x, y, z};
        };

        const _toLngLat = (zoom, x3, y3) => {
            const tiles = Math.pow(2, zoom),
                diameter = 2 * Math.PI,

                x2 = x3 * diameter / tiles - Math.PI,
                y2 = -(y3 * diameter / tiles - Math.PI),

                x1 = x2,
                y1 = 2 * (Math.atan(Math.exp(y2)) - 0.25 * Math.PI),

                lng = x1 * TO_DEGREES,
                lat = y1 * TO_DEGREES;

            return [lng, lat];
        };

        const _rgbToHex = function (c) {
            return "#" + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1).toUpperCase();
        };

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

        //endregion

        //region protected fields and methods (use 'p_' to differentiate).
        this.p_this = function () {
            return _self;
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
        this.getPixelArea = function (x, y, z) {
            const latLng1 = _toLngLat(z, x, y);
            const latLng2 = _toLngLat(z, x, y + 1);//tile below is +1 in Google coordinates
            const pixInM = _getPixelsInMeters(z, (latLng1[1] + latLng2[1]) / 2); //use mid-point of tile for all tile px
            return pixInM * pixInM;
        };

        this.getPixelColor = function (canvas, x, y) {
            const ctx = canvas.getContext('2d');

            const pixel = ctx.getImageData(x, y, 1, 1);
            const data = pixel.data;

            return _rgbToHex({
                r: data[0],
                g: data[1],
                b: data[2],
            });
        };

        this.countCanvasPixels = function (canvas, data) {
            const ctx = canvas.getContext('2d');
            const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const tileId = `${data.tile.x}_${data.tile.y}`
            //NOTE: not using terminate as its not clear it saves time, but too many threads can be slow
            // if (_workers[tileId] && !_workers[tileId].complete) {
            //     _workers[tileId].complete = true;
            //     _workers[tileId].worker.terminate();//invalidate old calls if still running
            //     _eventHandler.raiseEvent('onTerminate', tileId);
            //     _workers[tileId] = null;
            // }
            if (!_workers[tileId]) {
                _workers[tileId] = _assignWorker(Object.keys(_workers).length);
            }
            _workers[tileId].worker.postMessage({jobData: canvasData, options: _options, metaData: data});//will call "pixelsCounted" event;
        };

        this.getTilePosition = function (lat, lon, zoom) {
            const {x, y, z} = _pointToTileFraction(lat, lon, zoom);
            const tx = Math.floor(x);
            const ty = Math.floor(y);
            const ix = 256 * (x - tx);
            const iy = 256 * (y - ty);

            return {tx, ty, x: Math.round(ix), y: Math.round(iy)};
        };

        this.normalizeColor = function (color, palette, tol) {
            const colorRgb = _hexToRGB(color);
            let ans;
            Object.keys(palette).forEach((id) => {
                if (ans) return;
                const k = palette[id].color;
                const kRgb = _hexToRGB(k);
                if (kRgb && Math.abs(colorRgb.r - kRgb.r) <= tol
                    && Math.abs(colorRgb.g - kRgb.g) <= tol
                    && Math.abs(colorRgb.b - kRgb.b) <= tol) {
                    ans = k;
                }
            });
            return ans;
        }

        //endregion

        // _init();
    }
})();
