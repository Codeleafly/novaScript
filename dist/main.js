#!/usr/bin/env node
"use strict";
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
// src/main.ts
const parser_1 = __importDefault(require("./frontend/parser"));
const interpreter_1 = require("./runtime/interpreter");
const environment_1 = require("./runtime/environment");
const values_1 = require("./runtime/values");
const errors_1 = require("./runtime/errors");
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const prompt = (0, prompt_sync_1.default)({ sigint: true });
const VERSION = "v3.0.0";
function stringify(val) {
    switch (val.type) {
        case "string": return chalk_1.default.green(`${val.value}`);
        case "number": return chalk_1.default.yellow(val.value.toString());
        case "boolean": return chalk_1.default.cyan(val.value.toString());
        case "null": return chalk_1.default.gray("null");
        case "array":
            return chalk_1.default.white("[") + val.elements.map((e) => stringify(e)).join(chalk_1.default.white(", ")) + chalk_1.default.white("]");
        case "object":
            const props = Array.from(val.properties.entries())
                .map(([k, v]) => `${chalk_1.default.blue(k)}: ${stringify(v)}`)
                .join(chalk_1.default.white(", "));
            return chalk_1.default.white("{ ") + props + chalk_1.default.white(" }");
        case "function": return chalk_1.default.magenta("[Function]");
        case "native-fn": return chalk_1.default.magenta("[Native Function]");
        default: return JSON.stringify(val);
    }
}
function plainStringify(val) {
    switch (val.type) {
        case "string": return val.value;
        case "number": return val.value.toString();
        case "boolean": return val.value.toString();
        case "null": return "null";
        case "array":
            return "[" + val.elements.map((e) => plainStringify(e)).join(", ") + "]";
        case "object":
            const props = Array.from(val.properties.entries())
                .map(([k, v]) => `${k}: ${plainStringify(v)}`)
                .join(", ");
            return "{ " + props + " }";
        case "function": return "[Function]";
        case "native-fn": return "[Native Function]";
        default: return JSON.stringify(val);
    }
}
function setupEnv() {
    const env = (0, environment_1.createGlobalEnv)();
    env.declareVar("print", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        const output = args.map(arg => plainStringify(arg)).join(" ");
        console.log(output);
        return (0, values_1.MK_NULL)();
    }), true);
    env.declareVar("time", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        return (0, values_1.MK_NUMBER)(Date.now());
    }), true);
    env.declareVar("input", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        const promptText = args.length > 0
            ? args[0].value.toString()
            : "";
        const result = prompt(chalk_1.default.gray(promptText));
        return (0, values_1.MK_STRING)(result || "");
    }), true);
    env.declareVar("toInteger", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_NUMBER)(0);
        const val = args[0].value;
        return (0, values_1.MK_NUMBER)(parseInt(val) || 0);
    }), true);
    env.declareVar("toNumber", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_NUMBER)(0);
        const val = args[0].value;
        return (0, values_1.MK_NUMBER)(parseFloat(val) || 0);
    }), true);
    env.declareVar("toString", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_STRING)("");
        const val = args[0].value;
        return (0, values_1.MK_STRING)(val.toString());
    }), true);
    env.declareVar("isNumber", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        return (0, values_1.MK_BOOL)(args.length > 0 && args[0].type === "number");
    }), true);
    env.declareVar("isString", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        return (0, values_1.MK_BOOL)(args.length > 0 && args[0].type === "string");
    }), true);
    env.declareVar("isBoolean", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        return (0, values_1.MK_BOOL)(args.length > 0 && args[0].type === "boolean");
    }), true);
    env.declareVar("typeOf", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_STRING)("undefined");
        return (0, values_1.MK_STRING)(args[0].type);
    }), true);
    return env;
}
function reportError(err) {
    if (err instanceof errors_1.NovaError) {
        console.log(chalk_1.default.red.bold(`\n${err.type}: ${err.message}`));
        const loc = err.location;
        console.log(chalk_1.default.gray(`  at ${loc.file}:${loc.line}:${loc.column}`));
        if (loc.source) {
            const lines = loc.source.split("\n");
            const startLine = Math.max(0, loc.line - 2);
            const endLine = Math.min(lines.length, loc.line + 1);
            console.log("");
            for (let i = startLine; i < endLine; i++) {
                const lineNum = i + 1;
                const lineContent = lines[i];
                const marker = lineNum === loc.line ? chalk_1.default.red(">") : chalk_1.default.gray("|");
                console.log(`  ${chalk_1.default.gray(lineNum)} ${marker} ${lineContent}`);
                if (lineNum === loc.line) {
                    const padding = " ".repeat(String(lineNum).length + 4 + (loc.column > 0 ? loc.column - 1 : 0));
                    console.log(padding + chalk_1.default.red("^"));
                }
            }
        }
    }
    else {
        console.log(chalk_1.default.red.bold("\n[System Error]"));
        console.log(chalk_1.default.red("Message: ") + (err instanceof Error ? err.message : err));
    }
    console.log(chalk_1.default.gray("\n--- Diagnostic Information ---"));
    console.log(chalk_1.default.gray(`NovaScript: ${VERSION}`));
    console.log(chalk_1.default.gray(`OS: ${os.platform()} (${os.arch()})`));
    console.log(chalk_1.default.gray(`Node: ${process.version}`));
    console.log(chalk_1.default.gray(`Timestamp: ${new Date().toISOString()}`));
    console.log();
}
function run(filename) {
    const parser = new parser_1.default();
    const env = setupEnv();
    if (!fs.existsSync(filename)) {
        console.log(chalk_1.default.red.bold(`\nError: File not found: ${filename}`));
        return;
    }
    const input = fs.readFileSync(filename, "utf-8");
    try {
        const program = parser.produceAST(input, filename);
        (0, interpreter_1.evaluate)(program, env);
    }
    catch (e) {
        reportError(e);
    }
}
function repl() {
    const parser = new parser_1.default();
    const env = setupEnv();
    console.log(chalk_1.default.blue.bold("-----------------------------------------"));
    console.log(chalk_1.default.blue.bold(`   NovaScript Interactive REPL ${VERSION}    `));
    console.log(chalk_1.default.blue.bold("-----------------------------------------"));
    console.log(chalk_1.default.gray("Type 'exit' or press Ctrl+C to quit."));
    console.log();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk_1.default.cyan.bold("➜ "),
    });
    rl.prompt();
    rl.on("line", (inputLine) => {
        const line = inputLine.trim();
        if (line === "exit") {
            process.exit(0);
        }
        if (line === "") {
            rl.prompt();
            return;
        }
        try {
            const program = parser.produceAST(line, "repl");
            const result = (0, interpreter_1.evaluate)(program, env);
            if (result.type !== "null") {
                console.log(stringify(result));
            }
        }
        catch (e) {
            reportError(e);
        }
        rl.prompt();
    });
}
const args = process.argv;
if (args.length > 2) {
    const filename = args[2];
    run(filename);
}
else {
    repl();
}
