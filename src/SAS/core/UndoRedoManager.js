/**
 * Created by ycui on 8/27/14.
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    SAS.UndoRedoManager = function () {
        const _self = this;

        //region private fields and methods
        let _states;
        let _index;
//        var _isExecuting;

        const _init = function () {
            _states = [];
            _index = -1;
//            _isExecuting = false;
        };

        //endregion

        //region public methods
        this.add = function (state) {
//            if (_isExecuting) {
//                return;
//            }
            _states.splice(_index + 1, _states.length - _index);
            _states.push(state);

            _index = _states.length - 1;
        };

        this.undo = function () {
            let state = _states[_index];
            if (!state) {
                return;
            }
            _index = _index - 1;
            // console.log(`UNDO: current index ${_index} of ${_states.length}`);
            return _states[_index];
        };

        this.redo = function () {
            let state = _states[_index + 1];
            if (!state) {
                return;
            }
            _index = _index + 1;
            // console.log(`REDO: current index ${_index} of ${_states.length}`);
            return _states[_index];
        };

        this.clear = function () {
            // console.log("undoRedo clear...");
            const pre_size = _states.length;
            _states = [];
            _index = -1;
        };

        this.hasUndo = function () {
            return _index !== -1;
        };

        this.hasRedo = function () {
            return _index < (_states.length - 1);
        };

        this.getStates = function () {
            return _states;
        };

        //endregion

        _init();
    };
})();