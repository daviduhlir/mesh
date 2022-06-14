"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayIsSame = exports.arrayUnique = exports.randomHash = void 0;
function randomHash() {
    return [...Array(10)]
        .map(x => 0)
        .map(() => Math.random().toString(36).slice(2))
        .join('');
}
exports.randomHash = randomHash;
function arrayUnique(array) {
    const a = array.concat();
    for (let i = 0; i < a.length; ++i) {
        for (let j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j]) {
                a.splice(j--, 1);
            }
        }
    }
    return a;
}
exports.arrayUnique = arrayUnique;
function arrayIsSame(array1, array2) {
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0; i < array1.length; ++i) {
        if (array2.indexOf(array1[i]) === -1) {
            return false;
        }
    }
    return true;
}
exports.arrayIsSame = arrayIsSame;
//# sourceMappingURL=index.js.map