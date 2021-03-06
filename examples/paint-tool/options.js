//URL parameter defaults
//minZoom, maxZoom, lat and lon can be specified as URL parameters
//customOverlayTemplate can be used to specify a tile URL format for a custom overlay

//mapPaintOptions.minZoom and maxZoom allow you to specify which zoom levels allow for painting.
// Tiles are always stored at the maxZoom level natively, but can be drawn
// This can be any zoom level, but if the delta between minZoom and maxZoom is too large, it generates a large number of maxZoom tiles for a small brush stroke drawn at minZoom.
// A delta of 2 is recommended (giving 3 paintable zoom levels).
// optionally, you can set a different "outZoom" value to show painted areas visually - even when not at a "paintable" zoom

let mapPaintOptions = {
    outZoom: gupInt('outZoom', 10),
    minZoom: gupInt('minZoom', 17),
    maxZoom: gupInt('maxZoom', 19)//set to match ESRI aerial max
};

const customOverlayTemplate = decodeURIComponent(gup('customOverlayTemplate'));

let mapOptions = {
    initZoom: 13,
    minZoom: 3,
    maxZoom: mapPaintOptions.maxZoom,
};

const mapBoxAccessToken = 'ENTER YOUR ACCESS TOKEN';
const pixelWorkerDir = '../../src/worker';

let startCenter = [gupFloat('lat', 42.3601), gupFloat('lon', -71.0589)];

const DEBUG_MODE = false;//set to true to turn on the debug map layer with tile addresses

const paletteOptions = {
    'color1': {color: '#6ead20', title: 'Color 1'},
    'color2': {color: '#9867ce', title: 'Color 2'},
    'color3': {color: '#d29934', title: 'Color 3'},
    'color4': {color: '#2aa8a3', title: 'Color 4'},
    'color5': {color: '#9a361c', title: 'Color 5'},
    'color6': {color: '#babf45', title: 'Color 6'},
    'color7': {color: '#c95d8d', title: 'Color 7'},
};

function setupCustom(map, methods, overlays) {
    //setupCustom provides a hook for adding custom actions - for example the following method would let you run analysis and report metrics based on the areas drawn.
    methods.onPixelsCounted = (countsById) => {
        console.log('onPixelsCounted', countsById);
    };

    //default display is in square meters, this method lets us convert to acres
    // const acreSqM = 4046.86;
    // methods.displayArea = (pixelSum) => {
    //     return (Math.round(1000 * pixelSum / acreSqM) / 1000) + 'ac';
    // };

    const hectareSqM = 10000;
    methods.displayArea = (pixelSum) => {
        return (Math.round(1000 * pixelSum / hectareSqM) / 1000) + 'ha';
    };
}
