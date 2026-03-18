"use strict";
// src/runtime/interpreter.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const values_1 = require("./values");
const fs = __importStar(require("fs"));
const parser_1 = __importDefault(require("../frontend/parser"));
const environment_1 = __importDefault(require("./environment"));
const errors_1 = require("./errors");
class ReturnException extends Error {
    constructor(value) {
        super("Return");
        this.value = value;
    }
}
// We need a way to track location during evaluation. 
// For now, we'll pass it through or use a simple heuristic.
const dummyLoc = { file: "unknown", line: 0, column: 0 };
function evaluate(astNode, env) {
    switch (astNode.kind) {
        case "NumericLiteral":
            return {
                value: (astNode.value),
                type: "number",
            };
        case "StringLiteral":
            return {
                value: (astNode.value),
                type: "string",
            };
        case "Identifier":
            return eval_identifier(astNode, env);
        case "ObjectLiteral":
            return eval_object_expr(astNode, env);
        case "ArrayLiteral":
            return eval_array_expr(astNode, env);
        case "MemberExpr":
            return eval_member_expr(astNode, env);
        case "CallExpr":
            return eval_call_expr(astNode, env);
        case "AssignmentExpr":
            return eval_assignment(astNode, env);
        case "BinaryExpr":
            return eval_binary_expr(astNode, env);
        case "Program":
            return eval_program(astNode, env);
        case "VarDeclaration":
            return eval_var_declaration(astNode, env);
        case "FunctionDeclaration":
            return eval_function_declaration(astNode, env);
        case "IfStatement":
            return eval_if_statement(astNode, env);
        case "WhileStatement":
            return eval_while_statement(astNode, env);
        case "ForStatement":
            return eval_for_statement(astNode, env);
        case "ReturnStatement":
            const returnVal = astNode.value
                ? evaluate(astNode.value, env)
                : (0, values_1.MK_NULL)();
            throw new ReturnException(returnVal);
        case "ImportStatement":
            return eval_import_statement(astNode, env);
        default:
            throw new errors_1.NovaRuntimeError(`This AST Node has not yet been setup for interpretation: ${astNode.kind}`, dummyLoc);
    }
}
function eval_program(program, env) {
    let lastEvaluated = (0, values_1.MK_NULL)();
    for (const statement of program.body) {
        lastEvaluated = evaluate(statement, env);
    }
    return lastEvaluated;
}
function eval_var_declaration(declaration, env) {
    const value = declaration.value
        ? evaluate(declaration.value, env)
        : (0, values_1.MK_NULL)();
    try {
        return env.declareVar(declaration.identifier, value, declaration.constant);
    }
    catch (e) {
        throw new errors_1.NovaRuntimeError(e.message, dummyLoc);
    }
}
function eval_function_declaration(declaration, env) {
    const fn = {
        type: "function",
        name: declaration.name,
        parameters: declaration.parameters,
        declarationEnv: env,
        body: declaration.body,
    };
    return env.declareVar(declaration.name, fn, true);
}
function eval_identifier(ident, env) {
    try {
        return env.lookupVar(ident.symbol);
    }
    catch (e) {
        throw new errors_1.NovaReferenceError(e.message, dummyLoc);
    }
}
function eval_assignment(node, env) {
    if (node.assignee.kind !== "Identifier") {
        throw new errors_1.NovaTypeError(`Invalid LHS inside assignment expr ${node.assignee.kind}`, dummyLoc);
    }
    const varname = node.assignee.symbol;
    try {
        return env.assignVar(varname, evaluate(node.value, env));
    }
    catch (e) {
        throw new errors_1.NovaRuntimeError(e.message, dummyLoc);
    }
}
function eval_object_expr(obj, env) {
    const object = { type: "object", properties: new Map() };
    for (const { key, value } of obj.properties) {
        const runtimeVal = (value == undefined)
            ? env.lookupVar(key)
            : evaluate(value, env);
        object.properties.set(key, runtimeVal);
    }
    return object;
}
function eval_array_expr(arr, env) {
    const elements = arr.elements.map(element => evaluate(element, env));
    return (0, values_1.MK_ARRAY)(elements);
}
function eval_member_expr(expr, env) {
    const object = evaluate(expr.object, env);
    if (object.type !== "object") {
        throw new errors_1.NovaTypeError("Cannot access property of non-object. Found: " + object.type, dummyLoc);
    }
    let property = "";
    if (expr.computed) {
        const propVal = evaluate(expr.property, env);
        if (propVal.type !== "string") {
            throw new errors_1.NovaTypeError("Computed property key must be a string", dummyLoc);
        }
        property = propVal.value;
    }
    else {
        if (expr.property.kind !== "Identifier") {
            throw new errors_1.NovaTypeError("Dot notation requires identifier", dummyLoc);
        }
        property = expr.property.symbol;
    }
    const val = object.properties.get(property);
    if (val === undefined) {
        return (0, values_1.MK_NULL)();
    }
    return val;
}
function eval_call_expr(expr, env) {
    const args = expr.args.map((arg) => evaluate(arg, env));
    const fn = evaluate(expr.caller, env);
    if (fn.type == "native-fn") {
        const result = fn.call(args, env);
        return result;
    }
    if (fn.type == "function") {
        const func = fn;
        const scope = new environment_1.default(func.declarationEnv);
        for (let i = 0; i < func.parameters.length; i++) {
            const varname = func.parameters[i];
            scope.declareVar(varname, args[i] || (0, values_1.MK_NULL)(), false);
        }
        let result = (0, values_1.MK_NULL)();
        try {
            for (const stmt of func.body) {
                result = evaluate(stmt, scope);
            }
        }
        catch (e) {
            if (e instanceof ReturnException) {
                result = e.value;
            }
            else {
                throw e;
            }
        }
        return result;
    }
    throw new errors_1.NovaTypeError(`Cannot call value that is not a function: ${fn.type}`, dummyLoc);
}
function eval_binary_expr(binop, env) {
    const lhs = evaluate(binop.left, env);
    const rhs = evaluate(binop.right, env);
    if (binop.operator === "and" || binop.operator === "or") {
        if (lhs.type !== "boolean" || rhs.type !== "boolean") {
            throw new errors_1.NovaTypeError(`Logical operators '${binop.operator}' require boolean operands. Found ${lhs.type} and ${rhs.type}.`, dummyLoc);
        }
        const l = lhs.value;
        const r = rhs.value;
        return (0, values_1.MK_BOOL)(binop.operator === "and" ? (l && r) : (l || r));
    }
    if (binop.operator === "equals" || binop.operator === "==") {
        return (0, values_1.MK_BOOL)(lhs.type === rhs.type && lhs.value === rhs.value);
    }
    if (binop.operator === "not equals" || binop.operator === "!=") {
        return (0, values_1.MK_BOOL)(lhs.type !== rhs.type || lhs.value !== rhs.value);
    }
    if (lhs.type == "number" && rhs.type == "number") {
        return eval_numeric_binary_expr(lhs, rhs, binop.operator);
    }
    if (lhs.type == "string" && rhs.type == "string" && (binop.operator === "plus" || binop.operator === "+")) {
        return (0, values_1.MK_STRING)(lhs.value + rhs.value);
    }
    return (0, values_1.MK_NULL)();
}
function eval_numeric_binary_expr(lhs, rhs, operator) {
    if (operator == "plus" || operator == "+")
        return (0, values_1.MK_NUMBER)(lhs.value + rhs.value);
    else if (operator == "minus" || operator == "-")
        return (0, values_1.MK_NUMBER)(lhs.value - rhs.value);
    else if (operator == "times" || operator == "*")
        return (0, values_1.MK_NUMBER)(lhs.value * rhs.value);
    else if (operator == "divided by" || operator == "/") {
        if (rhs.value === 0) {
            throw new errors_1.NovaZeroDivisionError("Division by zero is not allowed.", dummyLoc);
        }
        return (0, values_1.MK_NUMBER)(lhs.value / rhs.value);
    }
    else if (operator == "modulo" || operator == "%")
        return (0, values_1.MK_NUMBER)(lhs.value % rhs.value);
    else if (operator == "greater than" || operator == ">")
        return (0, values_1.MK_BOOL)(lhs.value > rhs.value);
    else if (operator == "less than" || operator == "<")
        return (0, values_1.MK_BOOL)(lhs.value < rhs.value);
    else
        return (0, values_1.MK_NULL)();
}
function eval_if_statement(stmt, env) {
    const condition = evaluate(stmt.condition, env);
    if (condition.value === true) {
        const scope = new environment_1.default(env);
        let lastVal = (0, values_1.MK_NULL)();
        for (const s of stmt.thenBranch) {
            lastVal = evaluate(s, scope);
        }
        return lastVal;
    }
    else if (stmt.elseBranch) {
        const scope = new environment_1.default(env);
        let lastVal = (0, values_1.MK_NULL)();
        for (const s of stmt.elseBranch) {
            lastVal = evaluate(s, scope);
        }
        return lastVal;
    }
    return (0, values_1.MK_NULL)();
}
function eval_while_statement(stmt, env) {
    let lastVal = (0, values_1.MK_NULL)();
    while (true) {
        const condition = evaluate(stmt.condition, env);
        if (condition.type !== "boolean" || condition.value !== true) {
            break;
        }
        const scope = new environment_1.default(env);
        for (const s of stmt.body) {
            lastVal = evaluate(s, scope);
        }
    }
    return lastVal;
}
function eval_for_statement(stmt, env) {
    const startVal = evaluate(stmt.start, env);
    const endVal = evaluate(stmt.end, env);
    if (startVal.type !== "number" || endVal.type !== "number") {
        throw new errors_1.NovaTypeError("Repeat loop range must be numbers", dummyLoc);
    }
    let lastVal = (0, values_1.MK_NULL)();
    const scope = new environment_1.default(env);
    scope.declareVar(stmt.counter, startVal, false);
    let current = startVal.value;
    const end = endVal.value;
    while (current <= end) {
        const iterationScope = new environment_1.default(scope);
        for (const s of stmt.body) {
            lastVal = evaluate(s, iterationScope);
        }
        current++;
        scope.assignVar(stmt.counter, (0, values_1.MK_NUMBER)(current));
    }
    return lastVal;
}
function eval_import_statement(stmt, env) {
    const modulePath = stmt.moduleName;
    if (!fs.existsSync(modulePath)) {
        throw new errors_1.NovaImportError(`Cannot find module: ${modulePath}`, dummyLoc);
    }
    const source = fs.readFileSync(modulePath, "utf-8");
    const parser = new parser_1.default();
    const program = parser.produceAST(source, modulePath);
    evaluate(program, env);
    return (0, values_1.MK_NULL)();
}
