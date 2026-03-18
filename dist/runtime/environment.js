"use strict";
// src/runtime/environment.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalEnv = createGlobalEnv;
const values_1 = require("./values");
class Environment {
    constructor(parentENV) {
        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
    }
    declareVar(varname, value, constant) {
        if (this.variables.has(varname)) {
            throw new Error(`Cannot declare variable ${varname}. As it already is defined.`);
        }
        this.variables.set(varname, value);
        if (constant) {
            this.constants.add(varname);
        }
        return value;
    }
    assignVar(varname, value) {
        const env = this.resolve(varname);
        // check if constant
        if (env.constants.has(varname)) {
            throw new Error(`Cannot reassign to variable ${varname} as it was declared constant.`);
        }
        env.variables.set(varname, value);
        return value;
    }
    lookupVar(varname) {
        const env = this.resolve(varname);
        return env.variables.get(varname);
    }
    resolve(varname) {
        if (this.variables.has(varname)) {
            return this;
        }
        if (this.parent == undefined) {
            throw new Error(`Cannot resolve '${varname}' as it does not exist.`);
        }
        return this.parent.resolve(varname);
    }
}
exports.default = Environment;
function createGlobalEnv() {
    const env = new Environment();
    env.declareVar("true", (0, values_1.MK_BOOL)(true), true);
    env.declareVar("false", (0, values_1.MK_BOOL)(false), true);
    env.declareVar("null", (0, values_1.MK_NULL)(), true);
    return env;
}
