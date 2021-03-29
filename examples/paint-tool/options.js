//URL parameter defaults
//minZoom, maxZoom, lat and lon can be specified as URL parameters
//customOverlayTemplate can be used to specify a tile URL format for a custom overlay

//mapPaintOptions.minZoom and maxZoom allow you to specify which zoom levels allow for painting.
// Tiles are always stored at the maxZoom level natively, but can be drawn
// This can be any zoom level, but if the delta between minZoom and maxZoom is too large, it generates a large number of maxZoom tiles for a small brush stroke drawn at minZoom.
// A delta of 2 is recommended (giving 3 paintable zoom levels).
let mapPaintOptions = {
    minZoom: gupInt('minZoom', 18),
    maxZoom: gupInt('maxZoom', 20)
};

const customOverlayTemplate = decodeURIComponent(gup('customOverlayTemplate'));

let mapOptions = {
    initZoom: 13,
    minZoom: 3,
    maxZoom: 20
};

let startCenter = [gupFloat('lat', 42.3601), gupFloat('lon', -71.0589)];

const paletteOptions = {
    'color1': {color: '#768cc8', title: 'Color 1'},
    'color2': {color: '#d27f2b', title: 'Color 2'},
    'color3': {color: '#9b63cb', title: 'Color 3'},
    'color4': {color: '#84a73d', title: 'Color 4'},
    'color5': {color: '#c65a88', title: 'Color 5'},
    'color6': {color: '#5ca372', title: 'Color 6'},
    'color7': {color: '#c2674c', title: 'Color 7'},
};

function setupCustom(map, methods, overlays) {
    //setupCustom provides a hook for adding custom actions - for example the following method would let you run analysis and report metrics based on the areas drawn.
    methods.onPixelsCounted = (countsById) => {
        console.log('onPixelsCounted', countsById);
    };

    //default display is in square meters, this method lets us convert to acres
    const acreSqM = 4046.86;
    methods.displayArea = (pixelSum) => {
        return (Math.round(1000 * pixelSum / acreSqM) / 1000) + 'ac';
    };
}
