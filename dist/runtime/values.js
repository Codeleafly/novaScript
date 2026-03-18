"use strict";
// src/runtime/values.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.MK_NUMBER = MK_NUMBER;
exports.MK_NULL = MK_NULL;
exports.MK_BOOL = MK_BOOL;
exports.MK_STRING = MK_STRING;
exports.MK_NATIVE_FN = MK_NATIVE_FN;
exports.MK_OBJECT = MK_OBJECT;
exports.MK_ARRAY = MK_ARRAY;
function MK_NUMBER(n = 0) {
    return { type: "number", value: n };
}
function MK_NULL() {
    return { type: "null", value: null };
}
function MK_BOOL(b = true) {
    return { type: "boolean", value: b };
}
function MK_STRING(s) {
    return { type: "string", value: s };
}
function MK_NATIVE_FN(call) {
    return { type: "native-fn", call };
}
function MK_OBJECT(properties) {
    return { type: "object", properties };
}
function MK_ARRAY(elements) {
    return { type: "array", elements };
}
