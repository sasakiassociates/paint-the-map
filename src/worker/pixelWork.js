function countPixels(jobData, options) {
    var counts = {};
    var positions = {};
    var count = 0;
    // Row increment
    for (var row = 0; row < jobData.width; row++) {
        for (var col = 0; col < jobData.height; col++) {
            var indexNumber = count * 4;
            var a = jobData.data[indexNumber + 3];
            if (a === 255) {
                var color = {
                    r: jobData.data[indexNumber],
                    g: jobData.data[indexNumber + 1],
                    b: jobData.data[indexNumber + 2],
                    a: a
                };
                var id = color.r + '_' + color.g + '_' + color.b;
                if (!counts[id]) counts[id] = {color: color, count: 0};
                counts[id].count++;
                if (options.storePositions) {
                    if (!positions[id]) positions[id] = [];
                    positions[id].push([row, col]);
                }
            }
            count++;
        }
    }

    return {counts, positions};
}


self.onmessage = function (e) {
    var {counts, positions} = countPixels(e.data.jobData, e.data.options);

    let result = counts;
    if (e.data.options.storePositions) {
        result = {counts, positions};
    }

    self.postMessage({result: result, metaData: e.data.metaData});
};
