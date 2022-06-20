"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCResult = void 0;
class RPCResult {
    constructor(results) {
        this.results = results;
    }
    get isValid() {
        return !!this.firstResult;
    }
    get firstResult() {
        return this.results.find(i => !i?.error)?.result;
    }
    get firstError() {
        return this.results.find(i => i?.error)?.error;
    }
}
exports.RPCResult = RPCResult;
//# sourceMappingURL=RPCResult.js.map