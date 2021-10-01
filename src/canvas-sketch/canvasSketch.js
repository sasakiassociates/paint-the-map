let updateDrawingToolsState;

let $drawingCanvas = $('#drawingCanvas');

let userHasPainted = false;
const sketchCanvas = new SAS.SketchCanvas($drawingCanvas[0], 1, true);
const memoryTiles = new SAS.MemoryTiles(mapPaintOptions.outZoom, mapPaintOptions.maxZoom);
const pixelMath = new SAS.PixelMath({storePositions: false, pixelWorkFile: pixelWorkerDir + '/pixelWork.js?v=0.6'});
const analysisCanvas = new SAS.AnalysisCanvas();

let _saveOnEdit = false;
let paintPalette = {};
let canvasTiles;

const MISMATCH = 'MISMATCH';
const MATCH_TOL = 3;
// const selectedPal = 'phase1';

// sketchCanvas.setPaintColor(paintPalette[selectedPal]);

let drawingTools;
let countPixels;
const $palette = $('<div class="palette">').appendTo('body');
const $paintOpacity = $('<div class="paint-opacity">').appendTo('body');
$('<div class="title">').text('Paint Opacity').appendTo($paintOpacity);

const $flashCurrent = $('<button class="flash-current">').text('Highlight').appendTo('body');
let flashCanvas;
$flashCurrent.click(() => {
    if (!flashCanvas) {
        flashCanvas = analysisCanvas.findColorMatch($drawingCanvas[0], sketchCanvas.paintColorRgb(), MATCH_TOL);
        $(flashCanvas).addClass('flash-canvas').appendTo('body');
    } else {
        $(flashCanvas).remove();
        flashCanvas = null;
    }
})

let _paintOpacity = 80;
const _$paintOpacitySlider = $('<div class="paint-opacity-slider">').appendTo($paintOpacity).slider({
    range: "min",
    value: _paintOpacity,
    min: 0,
    max: 100
}).bind('slidechange', function (event, ui) {
    _paintOpacity = ui.value;
    canvasTiles.setOpacity(_paintOpacity / 100);
}).bind('slide', function (event, ui) {
    _paintOpacity = ui.value;
    canvasTiles.setOpacity(_paintOpacity / 100);
});

let lastSelectedPal;
const updatePaintPalette = (pp, selectedPal) => {
    $palette.empty();
    $('<div class = "palette-title">').text('Swatches').appendTo($palette).click(function () {
        $('.palette-option').toggle();
    });
    if (DEBUG_MODE) {
        $('<button>').text('recount').appendTo($palette).click(function () {
            countPixels();
        });
    }
    paintPalette = pp;
    paintPalette[MISMATCH] = {color: MISMATCH, title: 'MISMATCHED PIXELS'};
    console.log(paintPalette);
    Object.keys(paintPalette).forEach((k) => {
        const option = paintPalette[k];
        option.color = option.color.toUpperCase();//ensure consistency for pixel counts
        option.$div = $('<div class = "palette-option">').appendTo($palette).click(function () {
            lastSelectedPal = k;
            sketchCanvas.setPaintColor(option.color);
            drawingTools.setPaintColor(option.color);
            $('.palette-option').toggleClass('selected', false);
            option.$div.toggleClass('selected', true);
        });
        const $swatch = $('<div class = "palette-swatch">').css('background', option.color).appendTo(option.$div);
        const $title = $('<div class="title">').text(option.title).appendTo(option.$div);
        option.$count = $('<div class="count">').text('-').appendTo(option.$div);
        if (k===MISMATCH) {
            option.$elemToHideIfEmpty = option.$div;
            option.$elemToHideIfEmpty.hide();
        }
    });
    if (selectedPal && paintPalette[selectedPal]) {
        paintPalette[selectedPal].$div.click();
    } else if (lastSelectedPal && paintPalette[lastSelectedPal]) {
        paintPalette[lastSelectedPal].$div.click();
    }
};

setTimeout(function () {
    updatePaintPalette(paletteOptions, Object.keys(paletteOptions)[0]);
}, 100);

$drawingCanvas.on('mousewheel', function (event) {
    // console.log(event.deltaX, event.deltaY, event.deltaFactor);
    $('#zoomPan').click();
});

$(window).bind('resize', function () {
    const w = $(window).width();
    const h = $(window).height();

    let $canvas = $(sketchCanvas.canvas());
    $canvas.css('width', `${w}px`).attr('width', w);
    $canvas.css('height', `${h}px`).attr('height', h);
});
$(window).trigger('resize');

const setupMap = function () {
    L.mapbox.accessToken = mapBoxAccessToken;

    const map = L.mapbox.map('map', null, mapOptions).setView(startCenter, mapOptions.initZoom);
    const methods = {
        displayArea: function (pixelSum) {
            return Math.round(pixelSum).toLocaleString() + 'm&sup2;';
        }
    };
    const overlays = {};

    setupCustom(map, methods, overlays);

    const $searchDiv = $('<div id="search-holder">').appendTo('body');

    const geoCoder = new SAS.GeoCoder(map, $searchDiv);//, [-90.34, 34.69, -89.425, 35.433]);

    canvasTiles = L.tileLayer.canvas({maxZoom: mapPaintOptions.maxZoom, opacity: _paintOpacity / 100}).addTo(map);

    const drawDebugInfo = DEBUG_MODE;
    const drawnTiles = {};
    canvasTiles.drawTile = function (canvas, tilePoint, zoom) {
        const ctx = canvas.getContext('2d');
        $(canvas).addClass('canvasTile');
        const tileAddress = tilePoint.x + '_' + tilePoint.y + '_' + zoom;
        memoryTiles.drawFromMemory(canvas, tilePoint.x, tilePoint.y, zoom);
        drawnTiles[tileAddress] = {canvas: canvas, tilePoint: tilePoint, zoom: zoom};
        if (drawDebugInfo) {
            ctx.fillText(tilePoint.toString() + ': ' + zoom, 50, 50);
            ctx.strokeRect(0, 0, 256, 256);
        }
    };

    let frameNum = 1;
    // $( "body" ).keypress(function(e) {
    //     console.log( "Handler for .keypress() called.",e );
    //     if (e.keyCode === 115) {
    //         memoryTiles.download(`frame_${frameNum++}.json`);
    //     }
    //     if (e.keyCode === 101) {
    //         _saveOnEdit = !_saveOnEdit;
    //         console.log('_saveOnEdit', _saveOnEdit)
    //     }
    // });

    const useAutoSwitchFeature = false;
    let autoSwitchMap = true;
    map.on('baselayerchange', function (e) {
        autoSwitchMap = false;
    });

    if (customOverlayTemplate) {
        var custom_overlay_layer = L.tileLayer(customOverlayTemplate, {
            minZoom: 6,
            maxZoom: 20,
        }).addTo(map);
        overlays['Custom Overlay'] = custom_overlay_layer;
    }

    var Stamen_TonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        r: '',
        minZoom: 0,
        maxZoom: 20,
        ext: 'png'
    });

    var mapLink = '<a href="http://www.esri.com/">Esri</a>';
    var wholink = 'i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    var esriAerial = L.tileLayer(
        'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; '+mapLink+', '+wholink,
            maxZoom: 19,
        })


    let layerOptions = {
        // 'Street Map': L.mapbox.tileLayer('mapbox.streets'),
        // 'Pencil': L.mapbox.tileLayer('mapbox.pencil'),
        'Monochrome': Stamen_TonerLite,
        // 'Light Background': Stadia_AlidadeSmooth,
        // 'Dark Background': Stadia_AlidadeSmoothDark,
        // 'USGS Satellite': USGS_USImageryTopo,
        // 'USGS Contours': USGS_USTopo,
        // 'Satellite & Streets': L.mapbox.tileLayer('mapbox.streets-satellite'),
        'Satellite': esriAerial,//note: only up to zoom 19
        // 'Satellite': L.mapbox.tileLayer('mapbox.satellite')
    };
    let autoSelectedMap = layerOptions['Satellite'];
    autoSelectedMap.addTo(map);

    L.control.layers(layerOptions, {
        // 'Paint Layer': canvasTiles.addTo(map),
        ...overlays
    }).addTo(map);
    canvasTiles.setZIndex(4);

    const updateTileFromMemory = function (tile) {
        const tileAddress = tile.x + '_' + tile.y + '_' + tile.zoom;
        const tileInfo = drawnTiles[tileAddress];
        if (!tileInfo) return;//tile will be rendered from memoryTiles when it loads
        // noinspection SillyAssignmentJS
        tileInfo.canvas.width = tileInfo.canvas.width;//hack to clear canvas
        const ctx = tileInfo.canvas.getContext('2d');
        ctx.drawImage(tile.canvas, 0, 0);
        if (drawDebugInfo) {
            ctx.fillText(tileAddress, 50, 50);
            ctx.strokeRect(0, 0, 256, 256);
            ctx.strokeRect(0, 0, 256, 256);
        }
    };

    const redrawVisibleFromMemory = function () {
        iterateVisibleTiles(function (x, y, zoom) {
            memoryTiles.withTile(x, y, zoom, function (mTile) {
                updateTileFromMemory(mTile);
            });
            // const offset = $(tileInfo.canvas).offset();
            // memoryTiles.drawToMemory(x, y, zoom, sketchCanvas.canvas(), -offset.left, -offset.top);
            // console.log(x, y, zoom);
        });
    };

    const updateCanvasFromMemory = function () {
        const sCanvas = sketchCanvas.canvas();
        // noinspection SillyAssignmentJS
        sCanvas.width = sCanvas.width;//hack to clear canvas
        const ctx = sCanvas.getContext('2d');
        // console.log(`Update canvas from memory...`);
        iterateVisibleTiles(function (x, y, zoom) {
            const tileAddress = x + '_' + y + '_' + zoom;
            const tileInfo = drawnTiles[tileAddress];
            if (!tileInfo) return;
            memoryTiles.withTile(x, y, zoom, function (mTile, isBlank) {
                if (isBlank) return;
                const offset = $(tileInfo.canvas).offset();
                // console.log(`Update canvas from memory tile: ${x} ${y} ${zoom}`);
                ctx.drawImage(mTile.canvas, offset.left, offset.top);
            });
        });
    };

    map.on('movestart', function () {
        // $(sketchCanvas.canvas()).hide();
    });
    map.on('moveend', function () {
        updateCanvasFromMemory();

        // $(sketchCanvas.canvas()).toggle(sketchMode);

    });
    map.on('moveend', function () {
        updateDrawingToolsState();
        if (!useAutoSwitchFeature) return;
        if (autoSwitchMap) {
            const zoom = map.getZoom();

            let mapToSelect;
            if (zoom > 17) {//don't use Satellite & Streets above this as quality is poor
                mapToSelect = layerOptions['Satellite'];
            } else if (zoom < 15) {
                mapToSelect = layerOptions['Street Map'];
            } else {
                mapToSelect = layerOptions['Satellite & Streets'];
            }
            if (autoSelectedMap !== mapToSelect) {
                map.removeLayer(autoSelectedMap);
                autoSelectedMap = mapToSelect;
                autoSelectedMap.addTo(map);
            }

            autoSwitchMap = true;//in case switching event changed it... we only want this for user actions
        }
    });


    updateDrawingToolsState = function () {
        const states = {
            zoomPan: true,
            marker: false,
            paint_bucket: false,
            eraser: false,
            load: false,
            save: false,
            new: false,
            undo: false,
            redo: false,
        };

        let zoom = map.getZoom();
        if (zoom < mapPaintOptions.minZoom) {
            $drawingTips.css('left', 75).show().text(`Find a place then zoom in (${mapPaintOptions.minZoom - zoom}x) to ${userHasPainted ? 'continue' : 'start'} painting`);
        } else if (zoom > mapPaintOptions.maxZoom) {
            $drawingTips.css('left', 75).show().text(`Please zoom out to ${userHasPainted ? 'continue' : 'start'} painting`);
        } else {
            states.marker = true;
            states.paint_bucket = true;
            states.eraser = true;
            states.undo = true;
            states.redo = true;
            $drawingTips.hide();
        }
        drawingTools.setEnabled(states);
    };


    const explodeToMaxZoom = function (x, y, zoom, callback) {
        if (zoom > mapPaintOptions.maxZoom) return;

        const sides = 2;
        for (let tx = 0; tx < sides; tx++) {
            for (let ty = 0; ty < sides; ty++) {
                if (zoom === mapPaintOptions.maxZoom) {
                    callback(x + tx, y + ty, zoom);
                } else {
                    explodeToMaxZoom((x + tx) * 2, (y + ty) * 2, zoom + 1, callback);
                }
            }
        }
        // console.log('/======= ZOOM...');
    };

    const iterateVisibleTiles = function (callback) {
        //https://stackoverflow.com/questions/24895166/how-to-get-coords-of-tiles-that-are-currently-visible
        // get bounds, zoom and tileSize
        const bounds = map.getPixelBounds();
        const zoom = map.getZoom();
        const tileSize = 256;

        // get NorthWest and SouthEast points
        const nwTilePoint = new L.Point(Math.floor(bounds.min.x / tileSize),
            Math.floor(bounds.min.y / tileSize));

        const seTilePoint = new L.Point(Math.floor(bounds.max.x / tileSize),
            Math.floor(bounds.max.y / tileSize));

        // get max number of tiles in this zoom level
        const max = map.options.crs.scale(zoom) / tileSize;

        // enumerate visible tiles
        for (let x = nwTilePoint.x; x <= seTilePoint.x; x++) {
            for (let y = nwTilePoint.y; y <= seTilePoint.y; y++) {

                const xTile = (x + max) % max;
                const yTile = (y + max) % max;

                callback(xTile, yTile, zoom);
                // console.log('tile ' + xTile + ' ' + yTile);
            }
        }
    };

    memoryTiles.addListener('tileUpdate', function (tile) {
        updateTileFromMemory(tile);
    });
    memoryTiles.addListener('tileUpdatesComplete', function (tile) {
        // console.log(`tileUpdatesComplete...`);
        updateCanvasFromMemory();
        // countPixels();
    });

    let pendingCount = 0;

    const updatePalette = () => {
        const acreSqM = 4046.86;
        const countsById = {};
        Object.keys(paintPalette).forEach((k) => {
            const option = paintPalette[k];
            let pixelSum = pixelSums[option.color];
            countsById[k] = pixelSums[option.color];
            if (option.$elemToHideIfEmpty) {
                option.$elemToHideIfEmpty.toggle(pixelSum > 0);
            }
            let pixelSumStr = '-';
            if (pixelSum) {
                //displayArea
                if (methods.displayArea) {
                    pixelSumStr = methods.displayArea(pixelSum);
                } else {
                    pixelSumStr = (Math.round(1000 * pixelSum / acreSqM) / 1000) + 'ac';
                }
            }
            if (option.$count) option.$count.text(pixelSumStr);

        });
        return countsById;
    }

    const onComplete = () => {
        if (--pendingCount === 0) {
            console.log('ALL COUNTS COMPLETE');
            Object.keys(pixelSums).forEach((k) => {
                pixelSums[k] = 0;
            });
            Object.keys(pixelSumsByTile).forEach((tileId) => {
                const sums = pixelSumsByTile[tileId];
                Object.keys(pixelSums).forEach((k) => {
                    if (sums[k]) pixelSums[k] += sums[k];
                });
            });
            if (pixelSums[MISMATCH] > 0) {
                console.warn('pixelSums MISMATCHED', pixelSums[MISMATCH]);
            }
            const countsById = updatePalette();
            if (methods.onPixelsCounted) methods.onPixelsCounted(countsById);
        }
    }

    pixelMath.addListener('onTerminate', function (tileId) {
        onComplete();
    });

    const getCount = (countData, k) => {
        if (countData[k] && countData[k].count) {
            return countData[k].count;
        }
        return countData[k] || 0;
    };

    pixelMath.addListener('pixelsCounted', function (countData, metaData) {
        const pixelSqM = pixelMath.getPixelArea(metaData.tile.x, metaData.tile.y, metaData.tile.zoom);
        const tileId = `${metaData.tile.x}_${metaData.tile.y}`;
        pixelSumsByTile[tileId] = {};
        let verbose = false;//tileId === '74172_50606';
        if (verbose) {
            console.log('PIXELS COUNTED: ', JSON.stringify(countData));
        }
        Object.keys(countData).forEach((k) => {
            // if (!(k in pixelSums)) {
            const matchK = pixelMath.normalizeColor(k, paintPalette, MATCH_TOL);
            if (matchK) {
                if (!(matchK in countData)) {
                    if (verbose) console.log('NO EXISTING countData key:', matchK, ' existing key is ', k);
                    countData[matchK] = 0;
                }
                if (verbose) {
                    console.log(matchK, countData[matchK], countData[k]);
                }
                countData[matchK] += countData[k];
                if (matchK !== k) {
                    delete countData[k];
                }
            } else {
                if (verbose) {
                    console.log('mismatch', countData[k]);
                }
                if (!countData[MISMATCH]) countData[MISMATCH] = 0;
                countData[MISMATCH] += countData[k];
                delete countData[k];

                // console.warn(`Unexpected color: ${k} in tile ${tileId} - ${countData[k]} pixels`);
            }
            // }
        });
        if (verbose) {
            console.log('COUNT DATA NORMALIZED: ', JSON.stringify(countData));
        }
        Object.keys(countData).forEach((k) => {
            pixelSumsByTile[tileId][k] = getCount(countData, k) * pixelSqM;
            // if (countData[k].positions) {
            //     countData[k].positions.forEach((pos, i) => {
            //         pixelPositions[k].push([
            //             metaData.tile.x + pos[0] / 256,
            //             metaData.tile.y + pos[1] / 256,
            //         ]);
            //     });
            // }
        });
        onComplete();
        // Object.keys(pixelPositions).forEach((k) => {
        //     if (pixelPositions[k].length > 0) {
        //         console.log(k + ': ' + pixelPositions[k].length);
        //     }
        // });
    });

    methods.getPixelColorAt = function (lat, lon) {
        const tilePos = pixelMath.getTilePosition(lat, lon, mapPaintOptions.maxZoom);
        let color = false;
        memoryTiles.withTiles(mapPaintOptions.maxZoom, function (tile) {
            if (color) return;
            if (tilePos.tx === tile.x && tilePos.ty === tile.y) {
                color = pixelMath.getPixelColor(tile.canvas, tilePos.x, tilePos.y);
            }
        });
        return color;
    };

    methods.saveData = function (callback, postEndPoint) {
        memoryTiles.save(callback, postEndPoint);
    };
    methods.loadData = function (endPoint) {
        console.log('loadData', endPoint);
        try {
            memoryTiles.loadUrl(endPoint, function () {
                console.log('DATA LOADED - COUNT PIX');
                countPixels();
            });
        } catch {
            console.log('No existing file at ' + endPoint + ' assuming new');
        }
    };

    const pixelSums = {};
    const pixelSumsByTile = {};
    // const pixelPositions = {};

    methods.getColorKeys = () => Object.keys(paintPalette);
    // methods.nextPosition = (k) => {
    //     const option = paintPalette[k];
    //     let pixelPosition = pixelPositions[option.color];
    //     // console.log(option.color + ': ' + pixelPosition);
    //
    //     if (!pixelPosition) return false;
    //
    //     const n = pixelPosition.length;
    //     if (n === 0) return false;
    //     let pos = pixelPosition[Math.floor(Math.random() * n)];
    //     return {x: pos[0], y: pos[1]};
    // };

    countPixels = function (updatedTiles) {
        console.log('countPixels', updatedTiles);

        Object.keys(paintPalette).forEach((k) => {
            const option = paintPalette[k];
            pixelSums[option.color] = 0;
            // pixelPositions[option.color] = [];
        });
        // console.log('CLEAR '+JSON.stringify(pixelPositions));

        memoryTiles.withTiles(mapPaintOptions.maxZoom, function (tile) {
            let tileId = `${tile.x}_${tile.y}`;
            if (pixelSumsByTile[tileId] && updatedTiles && updatedTiles.indexOf(tileId) < 0) return;
            // console.log('CALL FOR COUNT', tile.x, tile.y, tile.zoom);
            pendingCount++;
            pixelMath.countCanvasPixels(tile.canvas, {
                tile: {
                    x: tile.x,
                    y: tile.y,
                    zoom: tile.zoom
                }
            });
        });
    };

    sketchCanvas.addListener('canvasUpdate', function () {
        userHasPainted = true;
        updateDrawingToolsState();

        // memoryTiles.saveUndoState();//save previous state before updating from canvas
        // console.log('Saved undo state...');
        //when the user finishes any drawing action, save all visible tiles at current zoom to memoryTiles
        const updatedTiles = [];
        iterateVisibleTiles(function (x, y, zoom) {
            const tileAddress = x + '_' + y + '_' + zoom;
            const tileInfo = drawnTiles[tileAddress];
            if (!tileInfo) {
                console.warn('visible tile not saved ' + tileAddress);
                return;
            }
            const offset = $(tileInfo.canvas).offset();
            const updated = memoryTiles.drawToMemory(x, y, zoom, sketchCanvas.canvas(), offset.left, offset.top);
            // console.log(x, y, zoom);
            if (updated) {
                explodeToMaxZoom(x, y, zoom, function (x, y, zoom) {
                    updatedTiles.push(x + '_' + y);
                });
            }
        });
        memoryTiles.saveUndoState();
        countPixels(updatedTiles);
        redrawVisibleFromMemory();

        if (methods.onCanvasUpdate) methods.onCanvasUpdate();


        // drawnTiles.forEach((tileInfo, i) => {
        //     // const position = $(tileInfo.canvas).position();
        //     const offset = $(tileInfo.canvas).offset();
        //     // noinspection SillyAssignmentJS
        //     tileInfo.canvas.width = tileInfo.canvas.width;//hack to clear canvas
        //     tileInfo.ctx.drawImage(sketchCanvas.canvas(), -offset.left, -offset.top);
        // });

        // console.log('CANVAS UPDATE');
        if (_saveOnEdit) {
            memoryTiles.download(`frame_${frameNum++}.json`);
        }
    });

    // console.log('memoryTiles: ' + memoryTiles);
    drawingTools = new SAS.DrawingTools(memoryTiles, false, () => {
        memoryTiles.save();
    }, () => {
        memoryTiles.wipe();//undo supported, so confirm not needed?
        memoryTiles.saveUndoState();
    }, {brushSlider: true, brushSize: 5, undoRedoOrderReversed: false});

    const $drawingTips = $('<div class="drawing-tips">').appendTo('body');
    updateDrawingToolsState();

    memoryTiles.saveUndoState();//square 1
    drawingTools.setActiveSketch(sketchCanvas);

};

setupMap();
