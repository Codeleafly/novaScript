
// src/runtime/errors.ts

export enum ErrorType {
    SyntaxError = "SyntaxError",
    TypeError = "TypeError",
    ReferenceError = "ReferenceError",
    RuntimeError = "RuntimeError",
    ImportError = "ImportError",
    ValueError = "ValueError",
    ZeroDivisionError = "ZeroDivisionError"
}

export interface ErrorLocation {
    file: string;
    line: number;
    column: number;
    source?: string;
}

export class NovaError extends Error {
    public type: ErrorType;
    public location: ErrorLocation;

    constructor(type: ErrorType, message: string, location: ErrorLocation) {
        super(message);
        this.type = type;
        this.location = location;
        Object.setPrototypeOf(this, NovaError.prototype);
    }
}

export class NovaSyntaxError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.SyntaxError, message, location);
    }
}

export class NovaTypeError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.TypeError, message, location);
    }
}

export class NovaReferenceError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.ReferenceError, message, location);
    }
}

export class NovaRuntimeError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.RuntimeError, message, location);
    }
}

export class NovaImportError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.ImportError, message, location);
    }
}

export class NovaValueError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.ValueError, message, location);
    }
}

export class NovaZeroDivisionError extends NovaError {
    constructor(message: string, location: ErrorLocation) {
        super(ErrorType.ZeroDivisionError, message, location);
    }
}
