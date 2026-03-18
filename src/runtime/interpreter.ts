
// src/runtime/interpreter.ts

import { NumberVal, RuntimeVal, MK_NULL, MK_NUMBER, MK_BOOL, StringVal, MK_STRING, ObjectVal, FunctionVal, NativeFnVal, ArrayVal, MK_ARRAY, BooleanVal, NullVal, MK_OBJECT } from "./values";
import { BinaryExpr, Identifier, NodeType, NumericLiteral, Program, Statement, VarDeclaration, AssignmentExpr, ObjectLiteral, CallExpr, FunctionDeclaration, StringLiteral, IfStatement, WhileStatement, ReturnStatement, ArrayLiteral, MemberExpr, ForStatement, ImportStatement, ImportExpr, GlobalDeclaration } from "../frontend/ast";
import * as fs from "fs";
import * as path from "path";
import Parser from "../frontend/parser";
import Environment, { createGlobalEnv } from "./environment";
import { NovaTypeError, NovaReferenceError, NovaRuntimeError, NovaZeroDivisionError, NovaImportError, ErrorLocation } from "./errors";

// Module cache to avoid re-evaluating the same module multiple times
const moduleCache = new Map<string, RuntimeVal>();

export class ReturnException extends Error {
    value: RuntimeVal;
    constructor(value: RuntimeVal) {
        super("Return");
        this.value = value;
    }
}

function getLocation(node: Statement): ErrorLocation {
    return {
        file: (node as any).file || "unknown",
        line: node.line || 0,
        column: node.column || 0
    };
}

export function evaluate(astNode: Statement, env: Environment): RuntimeVal {
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
      return eval_object_expr(astNode as ObjectLiteral, env);
      
    case "ArrayLiteral":
        return eval_array_expr(astNode as ArrayLiteral, env);

    case "MemberExpr":
        return eval_member_expr(astNode as MemberExpr, env);

    case "CallExpr":
      return eval_call_expr(astNode as CallExpr, env);

    case "AssignmentExpr":
      return eval_assignment(astNode as AssignmentExpr, env);

    case "BinaryExpr":
      return eval_binary_expr(astNode as BinaryExpr, env);

    case "Program":
      return eval_program(astNode as Program, env);

    case "VarDeclaration":
      return eval_var_declaration(astNode as VarDeclaration, env);
    
    case "GlobalDeclaration":
      return eval_global_declaration(astNode as GlobalDeclaration, env);
    
    case "FunctionDeclaration":
      return eval_function_declaration(astNode as FunctionDeclaration, env);
      
    case "IfStatement":
        return eval_if_statement(astNode as IfStatement, env);

    case "WhileStatement":
        return eval_while_statement(astNode as WhileStatement, env);
        
    case "ForStatement":
        return eval_for_statement(astNode as ForStatement, env);
        
    case "ReturnStatement":
        const returnVal = (astNode as ReturnStatement).value 
            ? evaluate((astNode as ReturnStatement).value!, env) 
            : MK_NULL();
        throw new ReturnException(returnVal);

    case "ImportStatement":
        return eval_import_statement(astNode as ImportStatement, env);
    
    case "ImportExpr":
        return eval_import_expr(astNode as ImportExpr, env);

    default:
      throw new NovaRuntimeError(
        `This AST Node has not yet been setup for interpretation: ${astNode.kind}`,
        getLocation(astNode)
      );
  }
}

function eval_program(program: Program, env: Environment): RuntimeVal {
  let lastEvaluated: RuntimeVal = MK_NULL();
  for (const statement of program.body) {
    lastEvaluated = evaluate(statement, env);
  }
  return lastEvaluated;
}

function eval_var_declaration(
  declaration: VarDeclaration,
  env: Environment
): RuntimeVal {
  const value = declaration.value
    ? evaluate(declaration.value, env)
    : MK_NULL();

  try {
      return env.declareVar(declaration.identifier, value, declaration.constant);
  } catch (e: any) {
      throw new NovaRuntimeError(e.message, getLocation(declaration));
  }
}

function eval_global_declaration(
  declaration: GlobalDeclaration,
  env: Environment
): RuntimeVal {
  const value = declaration.value
    ? evaluate(declaration.value, env)
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
  } as FunctionVal;

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

function eval_assignment(
  node: AssignmentExpr,
  env: Environment
): RuntimeVal {
  if (node.assignee.kind === "Identifier") {
    const varname = (node.assignee as Identifier).symbol;
    const value = evaluate(node.value, env);
    try {
        return env.assignVar(varname, value);
    } catch (e: any) {
        throw new NovaRuntimeError(e.message, getLocation(node));
    }
  } else if (node.assignee.kind === "MemberExpr") {
    const memberExpr = node.assignee as MemberExpr;
    const object = evaluate(memberExpr.object, env);
    
    if (object.type !== "object") {
        throw new NovaTypeError("Cannot assign to property of non-object.", getLocation(memberExpr));
    }
    
    let property = "";
    if (memberExpr.computed) {
        const propVal = evaluate(memberExpr.property, env);
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

    const value = evaluate(node.value, env);

    (object as ObjectVal).properties.set(property, value);
    return value;
  } else {
    throw new NovaTypeError(`Invalid LHS inside assignment expr ${node.assignee.kind}`, getLocation(node));
  }
}

function eval_object_expr(
  obj: ObjectLiteral,
  env: Environment
): RuntimeVal {
  const object = { type: "object", properties: new Map() } as ObjectVal;
  for (const { key, value } of obj.properties) {
    const runtimeVal = (value == undefined)
      ? env.lookupVar(key)
      : evaluate(value, env);

    object.properties.set(key, runtimeVal);
  }
  return object;
}

function eval_array_expr(
    arr: ArrayLiteral,
    env: Environment
): RuntimeVal {
    const elements = arr.elements.map(element => evaluate(element, env));
    return MK_ARRAY(elements);
}

function eval_member_expr(
    expr: MemberExpr,
    env: Environment
): RuntimeVal {
    const object = evaluate(expr.object, env);
    
    let property = "";
    let numericIndex = -1;

    if (expr.computed) {
        const propVal = evaluate(expr.property, env);
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
    
    if (object.type !== "object") {
        throw new NovaTypeError("Cannot access property of non-object. Found: " + object.type, getLocation(expr));
    }
    
    const key = numericIndex >= 0 ? String(numericIndex) : property;
    const val = (object as ObjectVal).properties.get(key);
    if (val === undefined) {
        return MK_NULL();
    }
    return val;
}

function eval_call_expr(
  expr: CallExpr,
  env: Environment
): RuntimeVal {
  const args = expr.args.map((arg) => evaluate(arg, env));
  const fn = evaluate(expr.caller, env);

  if (fn.type == "native-fn") {
    const result = (fn as NativeFnVal).call(args, env);
    return result;
  }

  if (fn.type == "function") {
    const func = fn as FunctionVal;
    const scope = new Environment(func.declarationEnv, "function"); // function scope

    for (let i = 0; i < func.parameters.length; i++) {
      const varname = func.parameters[i];
      scope.declareVar(varname, args[i] || MK_NULL(), false);
    }

    let result: RuntimeVal = MK_NULL();
    
    try {
        for (const stmt of func.body) {
            result = evaluate(stmt, scope);
        }
    } catch (e) {
        if (e instanceof ReturnException) {
            result = e.value;
        } else {
            throw e;
        }
    }
    
    return result;
  }

  throw new NovaTypeError(`Cannot call value that is not a function: ${fn.type}`, getLocation(expr));
}

function eval_binary_expr(
  binop: BinaryExpr,
  env: Environment
): RuntimeVal {
  if (binop.operator.startsWith("unary_")) {
      const arg = evaluate(binop.left, env);
      const op = binop.operator.split("_")[1].toLowerCase();
      
      if (op === "not") {
          if (arg.type !== "boolean") throw new NovaTypeError("not requires boolean", getLocation(binop));
          return MK_BOOL(!(arg as BooleanVal).value);
      }
      if (op === "-") {
          if (arg.type !== "number") throw new NovaTypeError("- requires number", getLocation(binop));
          return MK_NUMBER(-(arg as NumberVal).value);
      }
  }

  const lhs = evaluate(binop.left, env);
  const rhs = evaluate(binop.right, env);

  const op = binop.operator.toLowerCase();

  if (op === "and" || op === "or") {
      if (lhs.type !== "boolean" || rhs.type !== "boolean") {
          throw new NovaTypeError(`Logical operators '${op}' require boolean operands. Found ${lhs.type} and ${rhs.type}.`, getLocation(binop));
      }
      const l = (lhs as BooleanVal).value;
      const r = (rhs as BooleanVal).value;
      return MK_BOOL(op === "and" ? (l && r) : (l || r));
  }

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
  
  if (lhs.type == "string" && rhs.type == "string" && op === "+") {
      return MK_STRING((lhs as StringVal).value + (rhs as StringVal).value);
  }

  return MK_NULL();
}

function eval_numeric_binary_expr(
  lhs: NumberVal,
  rhs: NumberVal,
  operator: string,
  node: BinaryExpr
): NumberVal | BooleanVal | NullVal {
  if (operator == "+")
    return MK_NUMBER(lhs.value + rhs.value);
  else if (operator == "-")
    return MK_NUMBER(lhs.value - rhs.value);
  else if (operator == "*")
    return MK_NUMBER(lhs.value * rhs.value);
  else if (operator == "/") {
    if (rhs.value === 0) {
        throw new NovaZeroDivisionError("Division by zero is not allowed.", getLocation(node));
    }
    return MK_NUMBER(lhs.value / rhs.value);
  }
  else if (operator == "%")
    return MK_NUMBER(lhs.value % rhs.value);
  else if (operator == ">")
      return MK_BOOL(lhs.value > rhs.value);
  else if (operator == "<")
      return MK_BOOL(lhs.value < rhs.value);
  else 
      return MK_NULL();
}

function eval_if_statement(
    stmt: IfStatement,
    env: Environment
): RuntimeVal {
    const condition = evaluate(stmt.condition, env);
    
    if ((condition as BooleanVal).value === true) {
        const scope = new Environment(env, "block");
        let lastVal: RuntimeVal = MK_NULL();
        for (const s of stmt.thenBranch) {
            lastVal = evaluate(s, scope);
        }
        return lastVal;
    } else if (stmt.elseBranch) {
        const scope = new Environment(env, "block");
        let lastVal: RuntimeVal = MK_NULL();
        for (const s of stmt.elseBranch) {
            lastVal = evaluate(s, scope);
        }
        return lastVal;
    }
    return MK_NULL();
}

function eval_while_statement(
    stmt: WhileStatement,
    env: Environment
): RuntimeVal {
    let lastVal: RuntimeVal = MK_NULL();
    
    while (true) {
        const condition = evaluate(stmt.condition, env);
        if (condition.type !== "boolean" || (condition as BooleanVal).value !== true) {
            break;
        }
        const scope = new Environment(env, "block");
        for (const s of stmt.body) {
            lastVal = evaluate(s, scope);
        }
    }
    
    return lastVal;
}

function eval_for_statement(
    stmt: ForStatement,
    env: Environment
): RuntimeVal {
    const startVal = evaluate(stmt.start, env);
    const endVal = evaluate(stmt.end, env);
    
    if (startVal.type !== "number" || endVal.type !== "number") {
        throw new NovaTypeError("Repeat loop range must be numbers", getLocation(stmt));
    }
    
    let lastVal: RuntimeVal = MK_NULL();
    const scope = new Environment(env);
    
    scope.declareVar(stmt.counter, startVal, false);
    
    let current = (startVal as NumberVal).value;
    const end = (endVal as NumberVal).value;
    
    while (current <= end) {
        const iterationScope = new Environment(scope, "block");
        for (const s of stmt.body) {
            lastVal = evaluate(s, iterationScope);
        }
        current++;
        scope.assignVar(stmt.counter, MK_NUMBER(current));
    }
    
    return lastVal;
}

function eval_module(modulePath: string, parentEnv: Environment): RuntimeVal {
    const absolutePath = path.resolve(modulePath);
    if (moduleCache.has(absolutePath)) {
        return moduleCache.get(absolutePath)!;
    }

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Cannot find module: ${modulePath}`);
    }
    
    const source = fs.readFileSync(absolutePath, "utf-8");
    const parser = new Parser();
    const program = parser.produceAST(source, absolutePath);
    
    // Create a new environment for the module
    // It should have access to global built-ins but its own local scope
    // We can simulate this by having its parent be the global environment
    
    // To find global env, we traverse up from parentEnv
    let globalEnv = parentEnv;
    while ((globalEnv as any).parent) {
        globalEnv = (globalEnv as any).parent;
    }
    
    const moduleEnv = new Environment(globalEnv);
    const exports = MK_OBJECT(new Map());
    moduleEnv.declareVar("exports", exports, false);
    
    try {
        evaluate(program, moduleEnv);
    } catch (e) {
        throw e;
    }
    
    const result = moduleEnv.lookupVar("exports");
    moduleCache.set(absolutePath, result);
    return result;
}

function eval_import_statement(
    stmt: ImportStatement,
    env: Environment
): RuntimeVal {
    try {
        eval_module(stmt.moduleName, env);
        return MK_NULL();
    } catch (e: any) {
        throw new NovaImportError(e.message, getLocation(stmt));
    }
}

function eval_import_expr(
    expr: ImportExpr,
    env: Environment
): RuntimeVal {
    try {
        return eval_module(expr.moduleName, env);
    } catch (e: any) {
        throw new NovaImportError(e.message, getLocation(expr));
    }
}
