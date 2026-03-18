"use strict";
// src/runtime/errors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaZeroDivisionError = exports.NovaValueError = exports.NovaImportError = exports.NovaRuntimeError = exports.NovaReferenceError = exports.NovaTypeError = exports.NovaSyntaxError = exports.NovaError = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["SyntaxError"] = "SyntaxError";
    ErrorType["TypeError"] = "TypeError";
    ErrorType["ReferenceError"] = "ReferenceError";
    ErrorType["RuntimeError"] = "RuntimeError";
    ErrorType["ImportError"] = "ImportError";
    ErrorType["ValueError"] = "ValueError";
    ErrorType["ZeroDivisionError"] = "ZeroDivisionError";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class NovaError extends Error {
    constructor(type, message, location) {
        super(message);
        this.type = type;
        this.location = location;
        Object.setPrototypeOf(this, NovaError.prototype);
    }
}
exports.NovaError = NovaError;
class NovaSyntaxError extends NovaError {
    constructor(message, location) {
        super(ErrorType.SyntaxError, message, location);
    }
}
exports.NovaSyntaxError = NovaSyntaxError;
class NovaTypeError extends NovaError {
    constructor(message, location) {
        super(ErrorType.TypeError, message, location);
    }
}
exports.NovaTypeError = NovaTypeError;
class NovaReferenceError extends NovaError {
    constructor(message, location) {
        super(ErrorType.ReferenceError, message, location);
    }
}
exports.NovaReferenceError = NovaReferenceError;
class NovaRuntimeError extends NovaError {
    constructor(message, location) {
        super(ErrorType.RuntimeError, message, location);
    }
}
exports.NovaRuntimeError = NovaRuntimeError;
class NovaImportError extends NovaError {
    constructor(message, location) {
        super(ErrorType.ImportError, message, location);
    }
}
exports.NovaImportError = NovaImportError;
class NovaValueError extends NovaError {
    constructor(message, location) {
        super(ErrorType.ValueError, message, location);
    }
}
exports.NovaValueError = NovaValueError;
class NovaZeroDivisionError extends NovaError {
    constructor(message, location) {
        super(ErrorType.ZeroDivisionError, message, location);
    }
}
exports.NovaZeroDivisionError = NovaZeroDivisionError;
