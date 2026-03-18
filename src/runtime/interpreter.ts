
// src/runtime/interpreter.ts

import { NumberVal, RuntimeVal, MK_NULL, MK_NUMBER, MK_BOOL, StringVal, MK_STRING, ObjectVal, FunctionVal, NativeFnVal, ArrayVal, MK_ARRAY, BooleanVal, NullVal } from "./values";
import { BinaryExpr, Identifier, NodeType, NumericLiteral, Program, Statement, VarDeclaration, AssignmentExpr, ObjectLiteral, CallExpr, FunctionDeclaration, StringLiteral, IfStatement, WhileStatement, ReturnStatement, ArrayLiteral, MemberExpr, ForStatement, ImportStatement } from "../frontend/ast";
import * as fs from "fs";
import Parser from "../frontend/parser";
import Environment from "./environment";
import { NovaTypeError, NovaReferenceError, NovaRuntimeError, NovaZeroDivisionError, NovaImportError, ErrorLocation } from "./errors";

class ReturnException extends Error {
    value: RuntimeVal;
    constructor(value: RuntimeVal) {
        super("Return");
        this.value = value;
    }
}

// We need a way to track location during evaluation. 
// For now, we'll pass it through or use a simple heuristic.
const dummyLoc: ErrorLocation = { file: "unknown", line: 0, column: 0 };

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

    default:
      throw new NovaRuntimeError(
        `This AST Node has not yet been setup for interpretation: ${astNode.kind}`,
        dummyLoc
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
      throw new NovaRuntimeError(e.message, dummyLoc);
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
      throw new NovaReferenceError(e.message, dummyLoc);
  }
}

function eval_assignment(
  node: AssignmentExpr,
  env: Environment
): RuntimeVal {
  if (node.assignee.kind !== "Identifier") {
    throw new NovaTypeError(`Invalid LHS inside assignment expr ${node.assignee.kind}`, dummyLoc);
  }

  const varname = (node.assignee as Identifier).symbol;
  try {
      return env.assignVar(varname, evaluate(node.value, env));
  } catch (e: any) {
      throw new NovaRuntimeError(e.message, dummyLoc);
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
    
    if (object.type !== "object") {
        throw new NovaTypeError("Cannot access property of non-object. Found: " + object.type, dummyLoc);
    }
    
    let property = "";
    if (expr.computed) {
        const propVal = evaluate(expr.property, env);
        if (propVal.type !== "string") {
            throw new NovaTypeError("Computed property key must be a string", dummyLoc);
        }
        property = (propVal as StringVal).value;
    } else {
        if (expr.property.kind !== "Identifier") {
            throw new NovaTypeError("Dot notation requires identifier", dummyLoc);
        }
        property = (expr.property as Identifier).symbol;
    }
    
    const val = (object as ObjectVal).properties.get(property);
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
    const scope = new Environment(func.declarationEnv);

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

  throw new NovaTypeError(`Cannot call value that is not a function: ${fn.type}`, dummyLoc);
}

function eval_binary_expr(
  binop: BinaryExpr,
  env: Environment
): RuntimeVal {
  const lhs = evaluate(binop.left, env);
  const rhs = evaluate(binop.right, env);

  if (binop.operator === "and" || binop.operator === "or") {
      if (lhs.type !== "boolean" || rhs.type !== "boolean") {
          throw new NovaTypeError(`Logical operators '${binop.operator}' require boolean operands. Found ${lhs.type} and ${rhs.type}.`, dummyLoc);
      }
      const l = (lhs as BooleanVal).value;
      const r = (rhs as BooleanVal).value;
      return MK_BOOL(binop.operator === "and" ? (l && r) : (l || r));
  }

  if (binop.operator === "equals" || binop.operator === "==") {
      return MK_BOOL(lhs.type === rhs.type && (lhs as any).value === (rhs as any).value);
  }
  if (binop.operator === "not equals" || binop.operator === "!=") {
      return MK_BOOL(lhs.type !== rhs.type || (lhs as any).value !== (rhs as any).value);
  }

  if (lhs.type == "number" && rhs.type == "number") {
    return eval_numeric_binary_expr(
      lhs as NumberVal,
      rhs as NumberVal,
      binop.operator
    );
  }
  
  if (lhs.type == "string" && rhs.type == "string" && (binop.operator === "plus" || binop.operator === "+")) {
      return MK_STRING((lhs as StringVal).value + (rhs as StringVal).value);
  }

  return MK_NULL();
}

function eval_numeric_binary_expr(
  lhs: NumberVal,
  rhs: NumberVal,
  operator: string
): NumberVal | BooleanVal | NullVal {
  if (operator == "plus" || operator == "+")
    return MK_NUMBER(lhs.value + rhs.value);
  else if (operator == "minus" || operator == "-")
    return MK_NUMBER(lhs.value - rhs.value);
  else if (operator == "times" || operator == "*")
    return MK_NUMBER(lhs.value * rhs.value);
  else if (operator == "divided by" || operator == "/") {
    if (rhs.value === 0) {
        throw new NovaZeroDivisionError("Division by zero is not allowed.", dummyLoc);
    }
    return MK_NUMBER(lhs.value / rhs.value);
  }
  else if (operator == "modulo" || operator == "%")
    return MK_NUMBER(lhs.value % rhs.value);
  else if (operator == "greater than" || operator == ">")
      return MK_BOOL(lhs.value > rhs.value);
  else if (operator == "less than" || operator == "<")
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
        const scope = new Environment(env);
        let lastVal: RuntimeVal = MK_NULL();
        for (const s of stmt.thenBranch) {
            lastVal = evaluate(s, scope);
        }
        return lastVal;
    } else if (stmt.elseBranch) {
        const scope = new Environment(env);
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
        
        const scope = new Environment(env);
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
        throw new NovaTypeError("Repeat loop range must be numbers", dummyLoc);
    }
    
    let lastVal: RuntimeVal = MK_NULL();
    const scope = new Environment(env);
    
    scope.declareVar(stmt.counter, startVal, false);
    
    let current = (startVal as NumberVal).value;
    const end = (endVal as NumberVal).value;
    
    while (current <= end) {
        const iterationScope = new Environment(scope);
        for (const s of stmt.body) {
            lastVal = evaluate(s, iterationScope);
        }
        current++;
        scope.assignVar(stmt.counter, MK_NUMBER(current));
    }
    
    return lastVal;
}

function eval_import_statement(
    stmt: ImportStatement,
    env: Environment
): RuntimeVal {
    const modulePath = stmt.moduleName;
    if (!fs.existsSync(modulePath)) {
        throw new NovaImportError(`Cannot find module: ${modulePath}`, dummyLoc);
    }
    
    const source = fs.readFileSync(modulePath, "utf-8");
    const parser = new Parser();
    const program = parser.produceAST(source, modulePath);
    
    evaluate(program, env);
    
    return MK_NULL();
}
