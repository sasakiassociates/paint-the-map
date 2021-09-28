/**
 * User: kgoulding
 * Date: 2/14/14
 * Time: 8:49 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.AnalysisCanvas
     **/
    SAS.AnalysisCanvas = function (canvas) {
        const _self = this;

        //region private fields and methods
        const _eventHandler = new SAS.EventHandler();

        const _init = function () {

        };

        const _canvas = canvas;

        const _createCanvas = function (copyCanvas) {
            const canvas = document.createElement('canvas');
            canvas.width = copyCanvas.width;
            canvas.height = copyCanvas.height;
            return {
                canvas,
                ctx: canvas.getContext("2d")
            };
        };

        this.findColorMatch = function (sourceCanvas, colorRgb, tol) {
            const srcCtx = sourceCanvas.getContext('2d');
            const srcCanvasData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            const {canvas, ctx} = _createCanvas(sourceCanvas);
            const destCanvasData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

            let count = 0;
            for (let row = 0; row < srcCanvasData.width; row++) {
                for (let col = 0; col < srcCanvasData.height; col++) {
                    const indexNumber = count * 4;
                    const a = srcCanvasData.data[indexNumber + 3];
                    const outColor = {r: 0, g: 0, b: 0, a: 220}
                    if (a === 255) {
                        const color = {
                            r: srcCanvasData.data[indexNumber],
                            g: srcCanvasData.data[indexNumber + 1],
                            b: srcCanvasData.data[indexNumber + 2],
                            a: a
                        };
                        if (color && Math.abs(colorRgb.r - color.r) <= tol
                            && Math.abs(colorRgb.g - color.g) <= tol
                            && Math.abs(colorRgb.b - color.b) <= tol) {
                            outColor.r = 255;
                        }
                    }
                    destCanvasData.data[indexNumber] = outColor.r;
                    destCanvasData.data[indexNumber + 1] = outColor.g;
                    destCanvasData.data[indexNumber + 2] = outColor.b;
                    destCanvasData.data[indexNumber + 3] = outColor.a;
                    count++;
                }
            }

            ctx.putImageData(destCanvasData, 0, 0);
            return canvas;
        }

        //endregion

        _init();
    }
})();
