
// src/runtime/interpreter.ts

import { 
    RuntimeVal, NumberVal, StringVal, MK_NUMBER, MK_NULL, MK_OBJECT, MK_STRING, MK_BOOL, 
    MK_NATIVE_FN, MK_ARRAY, jsToRuntimeVal, runtimeToJsVal, FunctionVal, ObjectVal, ArrayVal, 
    NativeFnVal, BooleanVal, NullVal, MK_PROMISE, PromiseVal, plainStringify, ReturnException
} from "./values";
import { 
    BinaryExpr, Identifier, NodeType, NumericLiteral, Program, Statement, 
    VarDeclaration, AssignmentExpr, ObjectLiteral, CallExpr, FunctionDeclaration, 
    StringLiteral, IfStatement, WhileStatement, ReturnStatement, ArrayLiteral, 
    MemberExpr, ForStatement, ImportStatement, ImportExpr, GlobalDeclaration,
    SwitchStatement, CaseStatement, TryCatchStatement, ThrowStatement,
    BreakStatement, ContinueStatement, AwaitExpr, ArrowFnExpr, ExportDeclaration, NamedImportStatement
} from "../frontend/ast";
import * as fs from "fs";
import * as path from "path";
import Parser from "../frontend/parser";
import Environment, { createGlobalEnv } from "./environment";
import { 
    NovaTypeError, NovaReferenceError, NovaRuntimeError, NovaZeroDivisionError, 
    NovaImportError, ErrorLocation 
} from "./errors";
import { LibraryManager } from "./library_manager";

// Module cache to avoid re-evaluating the same module multiple times
const moduleCache = new Map<string, RuntimeVal>();


export class BreakException extends Error {
    constructor() {
        super("Break");
    }
}

export class ContinueException extends Error {
    constructor() {
        super("Continue");
    }
}

function getLocation(node: Statement): ErrorLocation {
    return {
        file: (node as any).file || "unknown",
        line: node.line || 0,
        column: node.column || 0
    };
}

export async function evaluate(astNode: Statement, env: Environment): Promise<RuntimeVal> {
  switch (astNode.kind) {
    case "NumericLiteral":
      return {
        value: ((astNode as NumericLiteral).value),
        type: "number",
      } as NumberVal;
    
    case "StringLiteral":
      return {
          value: ((astNode as StringLiteral).value),
          type: "string",
      } as StringVal;

    case "Identifier":
      return eval_identifier(astNode as Identifier, env);

    case "ObjectLiteral":
      return await eval_object_expr(astNode as ObjectLiteral, env);
      
    case "ArrayLiteral":
        return await eval_array_expr(astNode as ArrayLiteral, env);

    case "MemberExpr":
        return await eval_member_expr(astNode as MemberExpr, env);

    case "CallExpr":
      return await eval_call_expr(astNode as CallExpr, env);

    case "AssignmentExpr":
      return await eval_assignment(astNode as AssignmentExpr, env);

    case "BinaryExpr":
      return await eval_binary_expr(astNode as BinaryExpr, env);

    case "Program":
      return await eval_program(astNode as Program, env);

    case "VarDeclaration":
      return await eval_var_declaration(astNode as VarDeclaration, env);
    
    case "GlobalDeclaration":
      return await eval_global_declaration(astNode as GlobalDeclaration, env);
    
    case "FunctionDeclaration":
      return eval_function_declaration(astNode as FunctionDeclaration, env);
      
    case "IfStatement":
        return await eval_if_statement(astNode as IfStatement, env);

    case "WhileStatement":
        return await eval_while_statement(astNode as WhileStatement, env);
        
    case "ForStatement":
        return await eval_for_statement(astNode as ForStatement, env);

    case "SwitchStatement":
        return await eval_switch_statement(astNode as SwitchStatement, env);

    case "TryCatchStatement":
        return await eval_try_catch_statement(astNode as TryCatchStatement, env);
        
    case "ReturnStatement":
        const returnVal = (astNode as ReturnStatement).value 
            ? await evaluate((astNode as ReturnStatement).value!, env) 
            : MK_NULL();
        throw new ReturnException(returnVal);

    case "ThrowStatement":
        const throwVal = await evaluate((astNode as any).argument, env);
        throw throwVal; // Throwing the RuntimeVal directly for catch to handle

    case "BreakStatement":
        throw new BreakException();
    
    case "ContinueStatement":
        throw new ContinueException();

    case "AwaitExpr":
        const valToAwait = await evaluate((astNode as any).argument, env);
        // If it's a native Promise (from async fn or native), await it.
        // For simplicity, we assume the environment might contain promises if they come from JS interop,
        // but for Nova async fns, they will return a "promise-wrapped" RuntimeVal.
        if (valToAwait && (valToAwait as any).promise) {
            return await (valToAwait as any).promise;
        }
        return valToAwait;

    case "ImportStatement":
        return await eval_import_statement(astNode as ImportStatement, env);
    
    case "NamedImportStatement":
        return await eval_named_import_statement(astNode as NamedImportStatement, env);

    case "ImportExpr":
        return await eval_import_expr(astNode as ImportExpr, env);

    case "ArrowFnExpr":
        const arrowFn = astNode as ArrowFnExpr;
        return {
            type: "function",
            name: "anonymous",
            parameters: arrowFn.parameters,
            declarationEnv: env,
            body: Array.isArray(arrowFn.body) ? arrowFn.body : [ { kind: "ReturnStatement", value: arrowFn.body } as any ],
            async: arrowFn.async,
        } as FunctionVal;
        
    case "ExportDeclaration":
        return await eval_export_declaration(astNode as ExportDeclaration, env);

    default:
      throw new NovaRuntimeError(
        `This AST Node has not yet been setup for interpretation: ${astNode.kind}`,
        getLocation(astNode)
      );
  }
}

async function eval_program(program: Program, env: Environment): Promise<RuntimeVal> {
  let lastEvaluated: RuntimeVal = MK_NULL();
  for (const statement of program.body) {
    lastEvaluated = await evaluate(statement, env);
  }
  return lastEvaluated;
}

async function eval_var_declaration(
  declaration: VarDeclaration,
  env: Environment
): Promise<RuntimeVal> {
  const value = declaration.value
    ? await evaluate(declaration.value, env)
    : MK_NULL();

  try {
      return env.declareVar(declaration.identifier, value, declaration.constant);
  } catch (e: any) {
      throw new NovaRuntimeError(e.message, getLocation(declaration));
  }
}

async function eval_global_declaration(
  declaration: GlobalDeclaration,
  env: Environment
): Promise<RuntimeVal> {
  const value = declaration.value
    ? await evaluate(declaration.value, env)
    : MK_NULL();
  try {
      return env.declareGlobal(declaration.identifier, value, declaration.constant);
  } catch (e: any) {
      throw new NovaRuntimeError(e.message, getLocation(declaration));
  }
}

function eval_function_declaration(
  declaration: FunctionDeclaration,
  env: Environment
): RuntimeVal {
  const fn: FunctionVal = {
    type: "function",
    name: declaration.name,
    parameters: declaration.parameters,
    declarationEnv: env,
    body: declaration.body,
    async: declaration.async,
  } as FunctionVal;

  if (declaration.name === "anonymous") {
      return fn;
  }

  return env.declareVar(declaration.name, fn, true);
}

function eval_identifier(
  ident: Identifier,
  env: Environment
): RuntimeVal {
  try {
      return env.lookupVar(ident.symbol);
  } catch (e: any) {
      throw new NovaReferenceError(e.message, getLocation(ident));
  }
}

async function eval_assignment(
  node: AssignmentExpr,
  env: Environment
): Promise<RuntimeVal> {
  if (node.assignee.kind === "Identifier") {
    const varname = (node.assignee as Identifier).symbol;
    const value = await evaluate(node.value, env);
    try {
        return env.assignVar(varname, value);
    } catch (e: any) {
        throw new NovaRuntimeError(e.message, getLocation(node));
    }
  } else if (node.assignee.kind === "MemberExpr") {
    const memberExpr = node.assignee as MemberExpr;
    const object = await evaluate(memberExpr.object, env);
    
    if (object.type !== "object") {
        throw new NovaTypeError("Cannot assign to property of non-object.", getLocation(memberExpr));
    }
    
    let property = "";
    if (memberExpr.computed) {
        const propVal = await evaluate(memberExpr.property, env);
        if (propVal.type !== "string") {
            throw new NovaTypeError("Computed property key must be a string", getLocation(memberExpr));
        }
        property = (propVal as StringVal).value;
    } else {
        if (memberExpr.property.kind !== "Identifier") {
            throw new NovaTypeError("Dot notation requires identifier", getLocation(memberExpr));
        }
        property = (memberExpr.property as Identifier).symbol;
    }

    const value = await evaluate(node.value, env);

    (object as ObjectVal).properties.set(property, value);
    return value;
  } else {
    throw new NovaTypeError(`Invalid LHS inside assignment expr ${node.assignee.kind}`, getLocation(node));
  }
}

async function eval_object_expr(
  obj: ObjectLiteral,
  env: Environment
): Promise<RuntimeVal> {
  const object = { type: "object", properties: new Map() } as ObjectVal;
  for (const { key, value } of obj.properties) {
    const runtimeVal = (value == undefined)
      ? env.lookupVar(key)
      : await evaluate(value, env);

    object.properties.set(key, runtimeVal);
  }
  return object;
}

async function eval_array_expr(
    arr: ArrayLiteral,
    env: Environment
): Promise<RuntimeVal> {
    const elements: RuntimeVal[] = [];
    for (const element of arr.elements) {
        elements.push(await evaluate(element, env));
    }
    return MK_ARRAY(elements);
}

async function eval_member_expr(
    expr: MemberExpr,
    env: Environment
): Promise<RuntimeVal> {
    const object = await evaluate(expr.object, env);
    
    let property = "";
    let numericIndex = -1;

    if (expr.computed) {
        const propVal = await evaluate(expr.property, env);
        if (propVal.type === "number") {
            numericIndex = (propVal as NumberVal).value;
        } else if (propVal.type === "string") {
            property = (propVal as StringVal).value;
        } else {
            throw new NovaTypeError("Computed property key must be a string or number", getLocation(expr));
        }
    } else {
        if (expr.property.kind !== "Identifier") {
            throw new NovaTypeError("Dot notation requires identifier", getLocation(expr));
        }
        property = (expr.property as Identifier).symbol;
    }

    if (object.type === "null") {
        if (expr.optional) return MK_NULL();
        throw new NovaRuntimeError(`Cannot read property '${property}' of null`, getLocation(expr));
    }

    if (object.type === "array") {
        const arr = (object as ArrayVal).elements;
        if (numericIndex >= 0) {
            return arr[numericIndex] || MK_NULL();
        }
        if (property === "length") return MK_NUMBER(arr.length);
        throw new NovaTypeError(`Array does not have property ${property}`, getLocation(expr));
    }

    if (object.type === "string") {
        if (property === "length") return MK_NUMBER((object as StringVal).value.length);
        throw new NovaTypeError(`String does not have property ${property}`, getLocation(expr));
    }
    
    if (object.type !== "object" && object.type !== "native-fn") {
        if (expr.optional) return MK_NULL();
        throw new NovaTypeError("Cannot access property of non-object. Found: " + object.type, getLocation(expr));
    }
    
    const key = numericIndex >= 0 ? String(numericIndex) : property;
    let val = (object as any).properties.get(key);
    
    if (val === undefined) {
        // Lazy resolution fallback for native bridging (e.g., Proxies like chalk)
        if (object.underlyingValue && object.underlyingValue[key] !== undefined) {
            val = jsToRuntimeVal(object.underlyingValue[key]);
            (object as any).properties.set(key, val); // Cache it
        } else {
            return MK_NULL();
        }
    }
    return val;
}

async function eval_call_expr(
  expr: CallExpr,
  env: Environment
): Promise<RuntimeVal> {
  const args: RuntimeVal[] = [];
  for (const arg of expr.args) {
      args.push(await evaluate(arg, env));
  }
  const fn = await evaluate(expr.caller, env);

  // Handle optional chaining for calls: obj?.method()
  if (fn.type === "null" && expr.caller.kind === "MemberExpr" && (expr.caller as MemberExpr).optional) {
      return MK_NULL();
  }

  if (fn.type == "native-fn") {
    const fnVal = fn as NativeFnVal;
    // Map Nova values to JS values, wrapping Nova functions so JS can call them
    const jsArgs = args.map(arg => runtimeToJsVal(arg, (f) => wrapNovaFn(f, env)));
    
    // If it's a direct wrap of a JS function, call it with JS args
    if (fnVal.underlyingValue && typeof fnVal.underlyingValue === "function") {
        try {
            const result = fnVal.underlyingValue(...jsArgs);
            return jsToRuntimeVal(result);
        } catch (e: any) {
            throw new NovaRuntimeError(`Native call error: ${e.message}`, getLocation(expr));
        }
    }
    
    return await fnVal.call(args, env);
  }

  if (fn.type == "function") {
    const func = fn as FunctionVal;
    
    // Internal execution function to handle both sync and async
    const executeBody = async () => {
        const scope = new Environment(func.declarationEnv, "function");
        for (let i = 0; i < func.parameters.length; i++) {
          const varname = func.parameters[i];
          scope.declareVar(varname, args[i] || MK_NULL(), false);
        }

        let result: RuntimeVal = MK_NULL();
        try {
            for (const stmt of func.body) {
                result = await evaluate(stmt, scope);
            }
        } catch (e) {
            if (e instanceof ReturnException) {
                result = e.value;
            } else {
                throw e;
            }
        }
        return result;
    };

    if (func.async) {
        return MK_PROMISE(executeBody());
    } else {
        return await executeBody();
    }
  }

  throw new NovaTypeError(`Cannot call value that is not a function: ${fn.type}`, getLocation(expr));
}

async function eval_binary_expr(
  binop: BinaryExpr,
  env: Environment
): Promise<RuntimeVal> {
  if (binop.operator.startsWith("unary_")) {
      const arg = await evaluate(binop.left, env);
      const op = binop.operator.split("_")[1].toLowerCase();
      
      if (op === "not" || op === "!") {
          // Flexible truthiness for !
          if (arg.type === "boolean") return MK_BOOL(!(arg as BooleanVal).value);
          if (arg.type === "null") return MK_BOOL(true);
          if (arg.type === "number") return MK_BOOL((arg as NumberVal).value === 0);
          return MK_BOOL(false);
      }
      if (op === "-") {
          if (arg.type !== "number") throw new NovaTypeError("- requires number", getLocation(binop));
          return MK_NUMBER(-(arg as NumberVal).value);
      }
  }

  // Short-circuiting for logical operators
  const op = binop.operator.toLowerCase();
  if (op === "and" || op === "&&") {
      const lhs = await evaluate(binop.left, env);
      if (lhs.type !== "boolean") throw new NovaTypeError("&& requires boolean", getLocation(binop));
      if (!(lhs as BooleanVal).value) return MK_BOOL(false);
      const rhs = await evaluate(binop.right, env);
      if (rhs.type !== "boolean") throw new NovaTypeError("&& requires boolean", getLocation(binop));
      return MK_BOOL((rhs as BooleanVal).value);
  }
  if (op === "or" || op === "||") {
      const lhs = await evaluate(binop.left, env);
      if (lhs.type !== "boolean") throw new NovaTypeError("|| requires boolean", getLocation(binop));
      if ((lhs as BooleanVal).value) return MK_BOOL(true);
      const rhs = await evaluate(binop.right, env);
      if (rhs.type !== "boolean") throw new NovaTypeError("|| requires boolean", getLocation(binop));
      return MK_BOOL((rhs as BooleanVal).value);
  }

  const lhs = await evaluate(binop.left, env);
  const rhs = await evaluate(binop.right, env);

  if (op === "is" || op === "==") {
      return MK_BOOL(lhs.type === rhs.type && (lhs as any).value === (rhs as any).value);
  }
  if (op === "isnt" || op === "!=") {
      return MK_BOOL(lhs.type !== rhs.type || (lhs as any).value !== (rhs as any).value);
  }

  if (lhs.type == "number" && rhs.type == "number") {
    return eval_numeric_binary_expr(
      lhs as NumberVal,
      rhs as NumberVal,
      op,
      binop
    );
  }
  
  if (op === "+") {
      if (lhs.type === "string" || rhs.type === "string") {
          const lStr = lhs.type === "string" ? (lhs as StringVal).value : plainStringify(lhs);
          const rStr = rhs.type === "string" ? (rhs as StringVal).value : plainStringify(rhs);
          return MK_STRING(lStr + rStr);
      }
  }

  // Null Coalescing Operator ??
  if (op === "??") {
      return (lhs.type !== "null") ? lhs : rhs;
  }

  return MK_NULL();
}

function eval_numeric_binary_expr(
  lhs: NumberVal,
  rhs: NumberVal,
  operator: string,
  node: BinaryExpr
): NumberVal | BooleanVal | NullVal {
  const l = lhs.value;
  const r = rhs.value;

  switch (operator) {
      case "+": return MK_NUMBER(l + r);
      case "-": return MK_NUMBER(l - r);
      case "*": return MK_NUMBER(l * r);
      case "/":
          if (r === 0) throw new NovaZeroDivisionError("Division by zero", getLocation(node));
          return MK_NUMBER(l / r);
      case "%": return MK_NUMBER(l % r);
      case "**": return MK_NUMBER(Math.pow(l, r));
      case ">": return MK_BOOL(l > r);
      case "<": return MK_BOOL(l < r);
      case ">=": return MK_BOOL(l >= r);
      case "<=": return MK_BOOL(l <= r);
      // Bitwise
      case "&": return MK_NUMBER(l & r);
      case "|": return MK_NUMBER(l | r);
      case "^": return MK_NUMBER(l ^ r);
      case "<<": return MK_NUMBER(l << r);
      case ">>": return MK_NUMBER(l >> r);
      default: return MK_NULL();
  }
}

async function eval_if_statement(
    stmt: IfStatement,
    env: Environment
): Promise<RuntimeVal> {
    const condition = await evaluate(stmt.condition, env);
    
    if ((condition as BooleanVal).value === true) {
        const scope = new Environment(env, "block");
        let lastVal: RuntimeVal = MK_NULL();
        for (const s of stmt.thenBranch) {
            lastVal = await evaluate(s, scope);
        }
        return lastVal;
    } else if (stmt.elseBranch) {
        const scope = new Environment(env, "block");
        let lastVal: RuntimeVal = MK_NULL();
        for (const s of stmt.elseBranch) {
            lastVal = await evaluate(s, scope);
        }
        return lastVal;
    }
    return MK_NULL();
}

async function eval_while_statement(
    stmt: WhileStatement,
    env: Environment
): Promise<RuntimeVal> {
    let lastVal: RuntimeVal = MK_NULL();
    
    while (true) {
        const condition = await evaluate(stmt.condition, env);
        if (condition.type !== "boolean" || (condition as BooleanVal).value !== true) {
            break;
        }
        const scope = new Environment(env, "block");
        try {
            for (const s of stmt.body) {
                lastVal = await evaluate(s, scope);
            }
        } catch (e) {
            if (e instanceof BreakException) break;
            if (e instanceof ContinueException) continue;
            throw e;
        }
    }
    
    return lastVal;
}

async function eval_for_statement(
    stmt: ForStatement,
    env: Environment
): Promise<RuntimeVal> {
    if (stmt.init || stmt.condition || stmt.update) {
        // JS-style loop: for (init; condition; update)
        const scope = new Environment(env, "block");
        if (stmt.init) await evaluate(stmt.init, scope);
        
        let lastVal: RuntimeVal = MK_NULL();
        while (true) {
            if (stmt.condition) {
                const condition = await evaluate(stmt.condition, scope);
                if ((condition as BooleanVal).value !== true) break;
            }
            
            const iterationScope = new Environment(scope, "block");
            try {
                for (const s of stmt.body) {
                    lastVal = await evaluate(s, iterationScope);
                }
            } catch (e) {
                if (e instanceof BreakException) break;
                if (e instanceof ContinueException) {
                    if (stmt.update) await evaluate(stmt.update, scope);
                    continue;
                }
                throw e;
            }
            if (stmt.update) await evaluate(stmt.update, scope);
        }
        return lastVal;
    }

    // Nova-style: for i from start to end
    const startVal = await evaluate(stmt.start!, env);
    const endVal = await evaluate(stmt.end!, env);
    
    if (startVal.type !== "number" || endVal.type !== "number") {
        throw new NovaTypeError("Repeat loop range must be numbers", getLocation(stmt));
    }
    
    let lastVal: RuntimeVal = MK_NULL();
    const scope = new Environment(env);
    
    scope.declareVar(stmt.counter!, startVal, false);
    
    let current = (startVal as NumberVal).value;
    const end = (endVal as NumberVal).value;
    
    while (current <= end) {
        const iterationScope = new Environment(scope, "block");
        try {
            for (const s of stmt.body) {
                lastVal = await evaluate(s, iterationScope);
            }
        } catch (e) {
            if (e instanceof BreakException) break;
            if (e instanceof ContinueException) {
                current++;
                scope.assignVar(stmt.counter!, MK_NUMBER(current));
                continue;
            }
            throw e;
        }
        current++;
        scope.assignVar(stmt.counter!, MK_NUMBER(current));
    }
    
    return lastVal;
}

async function eval_module(modulePath: string, parentEnv: Environment, callerFile?: string): Promise<RuntimeVal> {
    let absolutePath: string;
    let isNative = false;
    
    // 1. Resolve Global/Multi-source imports (v6.0.0)
    if (modulePath.includes(":")) {
        const resolved = await LibraryManager.resolve(modulePath);
        absolutePath = resolved.path;
        isNative = resolved.isNative;
    } else {
        // Resolve bare module specifiers (e.g., 'chalk') vs relative paths
        const isBareModule = !modulePath.startsWith(".") && 
                             !path.isAbsolute(modulePath) && 
                             !modulePath.endsWith(".nv") && 
                             !modulePath.endsWith(".nova");

        if (isBareModule && !fs.existsSync(path.resolve(modulePath))) {
            absolutePath = modulePath;
            isNative = true;
        } else if (callerFile && callerFile !== "repl" && !path.isAbsolute(modulePath)) {
            absolutePath = path.resolve(path.dirname(callerFile), modulePath);
        } else {
            absolutePath = path.resolve(modulePath);
        }
    }

    if (moduleCache.has(absolutePath)) {
        return moduleCache.get(absolutePath)!;
    }

    const ext = path.extname(absolutePath);
    const isJS = ext === ".js" || ext === ".mjs" || ext === ".cjs" || isNative;

    // 2. Handle Native Node.js/NPM Modules (ESM + CJS support)
    if (isJS) {
        try {
            let nativeModule;
            try {
                // Try CommonJS first
                nativeModule = require(absolutePath);
            } catch (e: any) {
                // If it's an ESM package or core node: module that needs import()
                if (e.code === 'ERR_REQUIRE_ESM' || absolutePath.startsWith('node:') || ext === ".mjs") {
                    const esm = await import(absolutePath);
                    // ESM imports return a default if it's the only export, or a namespace
                    nativeModule = esm.default || esm;
                } else {
                    throw e;
                }
            }
            const result = jsToRuntimeVal(nativeModule);
            moduleCache.set(absolutePath, result);
            return result;
        } catch (e: any) {
            throw new Error(`Failed to load native module ${modulePath}: ${e.message}`);
        }
    }

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Cannot find module: ${modulePath} (resolved to: ${absolutePath})`);
    }
    
    const source = fs.readFileSync(absolutePath, "utf-8");
    const parser = new Parser();
    const program = parser.produceAST(source, absolutePath);
    
    let globalEnv = parentEnv;
    while ((globalEnv as any).parent) {
        globalEnv = (globalEnv as any).parent;
    }
    
    const moduleEnv = new Environment(globalEnv);
    const exports = MK_OBJECT(new Map());
    moduleEnv.declareVar("exports", exports, false);
    
    try {
        await evaluate(program, moduleEnv);
    } catch (e) {
        throw e;
    }
    
    const result = moduleEnv.lookupVar("exports");
    moduleCache.set(absolutePath, result);
    return result;
}

async function eval_switch_statement(
    stmt: SwitchStatement,
    env: Environment
): Promise<RuntimeVal> {
    const discriminant = await evaluate(stmt.discriminant, env);
    const discValue = (discriminant as any).value;
    
    let matched = false;
    let result: RuntimeVal = MK_NULL();
    
    for (const caseStmt of stmt.cases) {
        const test = await evaluate(caseStmt.test, env);
        if ((test as any).value === discValue) {
            matched = true;
            const scope = new Environment(env, "block");
            try {
                for (const s of caseStmt.consequent) {
                    result = await evaluate(s, scope);
                }
            } catch (e) {
                if (e instanceof BreakException) return MK_NULL();
                throw e;
            }
            break;
        }
    }
    
    if (!matched && stmt.default) {
        const scope = new Environment(env, "block");
        try {
            for (const s of stmt.default) {
                result = await evaluate(s, scope);
            }
        } catch (e) {
            if (e instanceof BreakException) return MK_NULL();
            throw e;
        }
    }
    
    return result;
}

async function eval_try_catch_statement(
    stmt: TryCatchStatement,
    env: Environment
): Promise<RuntimeVal> {
    const scope = new Environment(env, "block");
    let result: RuntimeVal = MK_NULL();
    
    try {
        for (const s of stmt.body) {
            result = await evaluate(s, scope);
        }
    } catch (e) {
        if (e instanceof ReturnException || e instanceof BreakException || e instanceof ContinueException) {
            throw e; // Control flow should bypass catch
        }
        
        // Nova throws RuntimeVals. Wrapped JS errors might also occur.
        const errorVal = (e instanceof Error) ? MK_STRING(e.message) : (e as RuntimeVal);
        
        if (stmt.catchBlock.length > 0) {
            const catchScope = new Environment(env, "block");
            if (stmt.catchParameter) {
                catchScope.declareVar(stmt.catchParameter, errorVal, true);
            }
            for (const s of stmt.catchBlock) {
                result = await evaluate(s, catchScope);
            }
        } else {
            // Rethrow if no catch
            throw e;
        }
    } finally {
        if (stmt.finallyBlock) {
            const finallyScope = new Environment(env, "block");
            for (const s of stmt.finallyBlock) {
                await evaluate(s, finallyScope);
            }
        }
    }
    
    return result;
}

async function eval_import_statement(
    stmt: ImportStatement,
    env: Environment
): Promise<RuntimeVal> {
    try {
        await eval_module(stmt.moduleName, env, (stmt as any).file);
        return MK_NULL();
    } catch (e: any) {
        throw new NovaImportError(e.message, getLocation(stmt));
    }
}

async function eval_named_import_statement(
    stmt: NamedImportStatement,
    env: Environment
): Promise<RuntimeVal> {
    try {
        const moduleVal = await eval_module(stmt.moduleName, env, (stmt as any).file);
        
        if (moduleVal.type !== "object") {
            throw new NovaImportError(`Module '${stmt.moduleName}' did not export an object`, getLocation(stmt));
        }

        const exportsMap = (moduleVal as ObjectVal).properties;
        for (const name of stmt.imports) {
            if (exportsMap.has(name)) {
                env.declareVar(name, exportsMap.get(name)!, true);
            } else {
                throw new NovaImportError(`Module '${stmt.moduleName}' has no export named '${name}'`, getLocation(stmt));
            }
        }
        return MK_NULL();
    } catch (e: any) {
        throw new NovaImportError(e.message, getLocation(stmt));
    }
}

async function eval_export_declaration(
    decl: ExportDeclaration,
    env: Environment
): Promise<RuntimeVal> {
    const value = await evaluate(decl.declaration, env);
    
    // Exports are collected in an 'exports' object.
    // Ensure 'exports' is available in the current environment
    try {
        const exportsObj = env.lookupVar("exports");
        if (exportsObj.type === "object") {
            let name = "";
            if (decl.declaration.kind === "VarDeclaration") name = (decl.declaration as VarDeclaration).identifier;
            else if (decl.declaration.kind === "FunctionDeclaration") name = (decl.declaration as FunctionDeclaration).name;
            
            if (name) {
                (exportsObj as ObjectVal).properties.set(name, value);
            }
        }
    } catch (e) {
        // If 'exports' wasn't declared, we're likely in REPL or not a module, ignore it silently.
    }

    return value;
}

async function eval_import_expr(
    expr: ImportExpr,
    env: Environment
): Promise<RuntimeVal> {
    try {
        const modNameVal = await evaluate(expr.moduleName, env);
        if (modNameVal.type !== "string") {
            throw new NovaImportError("Module name in include() must evaluate to a string.", getLocation(expr));
        }
        return await eval_module((modNameVal as StringVal).value, env, (expr as any).file);
    } catch (e: any) {
        throw new NovaImportError(e.message, getLocation(expr));
    }
}

/**
 * Wraps a NovaScript function as a native JavaScript function.
 * This allows passing Nova functions as callbacks to Node.js modules.
 */
function wrapNovaFn(func: FunctionVal, env: Environment): Function {
    return (...jsArgs: any[]) => {
        const args = jsArgs.map(arg => jsToRuntimeVal(arg));
        
        const executeBody = async () => {
            const scope = new Environment(func.declarationEnv, "function");
            for (let i = 0; i < func.parameters.length; i++) {
                scope.declareVar(func.parameters[i], args[i] || MK_NULL(), false);
            }

            let result: RuntimeVal = MK_NULL();
            try {
                for (const stmt of func.body) {
                    result = await evaluate(stmt, scope);
                }
            } catch (e) {
                if (e instanceof ReturnException) {
                    result = e.value;
                } else {
                    throw e;
                }
            }
            return runtimeToJsVal(result);
        };

        return executeBody(); // Returns a promise to the JS caller
    };
}
