"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash = exports.randomHash = void 0;
const crypto_1 = require("crypto");
function randomHash() {
    return [...Array(10)]
        .map(x => 0)
        .map(() => Math.random().toString(36).slice(2))
        .join('');
}
exports.randomHash = randomHash;
function hash(string) {
    return crypto_1.createHash('sha256').update(string).digest('hex');
}
exports.hash = hash;
//# sourceMappingURL=utils.js.map