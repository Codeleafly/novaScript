
// src/runtime/environment.ts

import { RuntimeVal, MK_BOOL, MK_NULL } from "./values";

export type ScopeType = "global" | "function" | "block";

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeVal>;
  private constants: Set<string>;
  public scopeType: ScopeType;

  constructor(parentENV?: Environment, scopeType: ScopeType = "block") {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
    this.scopeType = scopeType;
  }

  // Traverse up to find the global (root) environment
  public getGlobalEnv(): Environment {
    let env: Environment = this;
    while (env.parent) {
      env = env.parent;
    }
    return env;
  }

  // Declare a local (block/function-scoped) variable
  public declareVar(
    varname: string,
    value: RuntimeVal,
    constant: boolean
  ): RuntimeVal {
    if (this.variables.has(varname)) {
      throw new Error(`Cannot declare variable '${varname}'. It is already defined in this scope.`);
    }
    this.variables.set(varname, value);
    if (constant) {
      this.constants.add(varname);
    }
    return value;
  }

  // Declare a global variable — always goes on the root environment
  public declareGlobal(
    varname: string,
    value: RuntimeVal,
    constant: boolean
  ): RuntimeVal {
    const global = this.getGlobalEnv();
    // Allow re-assignment of non-const globals from inner scopes
    if (global.variables.has(varname) && global.constants.has(varname)) {
      throw new Error(`Cannot redeclare constant global '${varname}'.`);
    }
    global.variables.set(varname, value);
    if (constant) {
      global.constants.add(varname);
    }
    return value;
  }

  public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
    const env = this.resolve(varname);
    if (env.constants.has(varname)) {
      throw new Error(`Cannot reassign to constant '${varname}'.`);
    }
    env.variables.set(varname, value);
    return value;
  }

  public lookupVar(varname: string): RuntimeVal {
    const env = this.resolve(varname);
    return env.variables.get(varname) as RuntimeVal;
  }

  public resolve(varname: string): Environment {
    if (this.variables.has(varname)) {
      return this;
    }
    if (this.parent == undefined) {
      throw new Error(`Cannot resolve '${varname}' as it does not exist.`);
    }
    return this.parent.resolve(varname);
  }

  public hasOwn(varname: string): boolean {
    return this.variables.has(varname);
  }
}

export function createGlobalEnv() {
    const env = new Environment(undefined, "global");
    env.declareVar("true", MK_BOOL(true), true);
    env.declareVar("false", MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);
    return env;
}
