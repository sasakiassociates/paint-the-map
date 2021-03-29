/**
 * User: kgoulding
 * Date: 2/14/14
 * Time: 9:04 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.ImageUndoRedo
     **/
    SAS.ImageUndoRedo = function (canvas, ctx) {
        var _self = this;

        //region private fields and methods
        var _canvas = canvas;
        var _ctx = ctx;
        var _redoList = [];
        var _undoList = [];

        var _saveState = function (list, keep_redo) {
            keep_redo = keep_redo || false;
            if (!keep_redo) {
                _redoList = [];
            }

            (list || _undoList).push(_ctx.getImageData(0, 0, _canvas.width, _canvas.height));
        };

        var _undo = function () {
            _restoreState(_undoList, _redoList);
        };

        var _redo = function () {
            _restoreState(_redoList, _undoList);
        };

        var _restoreState = function (pop, push) {
            if (pop.length) {
                _saveState(push, true);
                var restore_state = pop.pop();
                _ctx.putImageData(restore_state, 0, 0);
            }
        };
        //endregion

        //region public API
        this.undo = function () {
            _undo();
        };

        this.redo = function () {
            _redo();
        };

        this.saveState = function () {
            _saveState();
        };

        this.unsaveState = function () {
            if (_undoList.length > 0) _undoList.pop();
        };
        //endregion

    };
})();