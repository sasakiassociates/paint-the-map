/**
 * User: kgoulding
 * Date: 2/22/14
 * Time: 12:13 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.BridsonSampler2D
     **/
    SAS.BridsonSampler2D = function () {
        const _self = this;

        //region private fields and methods

        let _hitTest = (x, y) => {
            return true;
        };

        const _init = function () {

        };

        const _testRun = function () {
            const areaPerPoint = 1;
            const numPoints = 1000;
            const width = 100;
            const height = 100;
            const next = () => {
                return {x: width * Math.random(), y: width * Math.random()}
            };

            const sampler = _poissonDiscSampler(width, height, Math.sqrt(areaPerPoint), () => {
                let pos = next();
                console.log(pos);
                return pos;
            });

            const points = [];
            let sample;
            while ((sample = sampler()) && points.length < numPoints) {
                points.push(sample);
            }
            console.log(JSON.stringify(points, null, 2));

        };

        const _poissonDiscSampler = function (width, height, radius, next) {
            const k = 30; // maximum number of samples before rejection
            const radius2 = radius * radius;
            const R = 3 * radius2;
            const cellSize = radius * Math.SQRT1_2;

            const gridWidth = Math.ceil(width / cellSize);
            const gridHeight = Math.ceil(height / cellSize);

            const grid = new Array(gridWidth * gridHeight);

            const queue = [];
            let queueSize = 0;

            let sampleSize = 0;

            const rng = Math.random;

            function far(x, y) {
                let i = x / cellSize | 0;
                let j = y / cellSize | 0;

                const i0 = Math.max(i - 2, 0);
                const j0 = Math.max(j - 2, 0);
                const i1 = Math.min(i + 3, gridWidth);
                const j1 = Math.min(j + 3, gridHeight);

                for (j = j0; j < j1; ++j) {
                    const o = j * gridWidth;

                    for (i = i0; i < i1; ++i) {
                        let s;

                        if ((s = grid[o + i])) {
                            const dx = s[0] - x,
                                dy = s[1] - y;

                            if (dx * dx + dy * dy < radius2) {
                                return false;
                            }
                        }
                    }
                }

                return true;
            }

            function sample(x, y) {
                const s = [x, y];

                queue.push(s);

                grid[gridWidth * (y / cellSize | 0) + (x / cellSize | 0)] = s;

                sampleSize++;
                queueSize++;

                return s;
            }

            function reset() {
                sampleSize = 0;
                queueSize = 0;
            }

            function run() {
                if (!sampleSize) {
                    const nextPos = next();
                    if (nextPos === false) return;
                    return sample(nextPos.x, nextPos.y);
                }

                // Pick a random existing sample and remove it from the queue.
                while (queueSize) {
                    const i = rng() * queueSize | 0;
                    const s = queue[i];

                    // Make a new candidate between [radius, 2 * radius] from the existing
                    // sample.
                    for (let j = 0; j < k; ++j) {
                        const a = 2 * Math.PI * rng();
                        const r = Math.sqrt(rng() * R + radius2);
                        const x = s[0] + r * Math.cos(a);
                        const y = s[1] + r * Math.sin(a);

                        // Reject candidates that are outside the allowed extent,
                        // or closer than 2 * radius to any existing sample.

                        //Sasaki edit: we also check using a hit test against the target areas
                        //because this sampler acts locally and grows out, this can avoid wasting sampling on empty areas
                        if (x >= 0 && x < width && y >= 0 && y < height && far(x, y) && _hitTest(x, y)) {
                            return sample(x, y);
                        }
                    }

                    queue[i] = queue[--queueSize];
                    queue.length = queueSize;
                }
            }

            return {reset, run, far};
        };

        //endregion

        //region protected fields and methods (use '_' to differentiate).
        //this._getFoo = function() { ...
        //endregion

        //region public API

        this.samplePixelArea = function (width, height, next, areaPerPoint, numPoints, hitTest) {
            _hitTest = hitTest;

            //rather than randomly picking 'next' points anywhere that matches a filled color
            //can we somehow tap into the grid structure used in this algo and define which grid cells are included
            //and could we also use something like cellular automata to remove all 'edge' grid cells so that we get points
            //that are also internalized (i.e. treat all white space as though it's other points)

            const points = [];

            const sampler = _poissonDiscSampler(width, height, Math.sqrt(areaPerPoint), () => {
                const candidatePoints = [];
                for (let i = 0; i < 1; i++) {//arbitrary # of random points to grab from which to pick next best starting pt
                    candidatePoints.push(next());
                }
                for (let i = 0; i < candidatePoints.length; i++) {
                    const {x, y} = candidatePoints[i];
                    if (sampler.far(x, y)) {//only return candidate points that are far enough from all existing points
                        return {x, y}
                    }
                }
                return false;
            });
            let sample;

            let safety = 100;
            let lastLength = points.length;
            while (points.length < numPoints && --safety > 0) {
                while ((sample = sampler.run()) && points.length < numPoints) {
                    points.push(sample);
                }
                sampler.reset();
                if (lastLength === points.length) break;
            }

            console.log(points.length + ' of ' + numPoints);
            return points;

        };
        //endregion

        _init();
    }
})();

