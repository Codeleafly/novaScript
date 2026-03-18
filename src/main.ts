#!/usr/bin/env node
// src/main.ts
import Parser from "./frontend/parser";
import { evaluate } from "./runtime/interpreter";
import { createGlobalEnv } from "./runtime/environment";
import { MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_STRING, MK_BOOL, MK_OBJECT, MK_ARRAY, RuntimeVal, StringVal } from "./runtime/values";
import { NovaError, ErrorLocation, ErrorType } from "./runtime/errors";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import chalk from "chalk";
import promptSync from "prompt-sync";

// Native Modules
import { createFSModule } from "./runtime/native/fs_module";
import { createHTTPModule } from "./runtime/native/http_module";
import { createSysModule } from "./runtime/native/sys_module";

const prompt = promptSync({ sigint: true });
const VERSION = "v5.5.0-dev";

function stringify(val: RuntimeVal): string {
    switch (val.type) {
        case "string": return chalk.green(`${(val as StringVal).value}`);
        case "number": return chalk.yellow((val as any).value.toString());
        case "boolean": return chalk.cyan((val as any).value.toString());
        case "null": return chalk.gray("null");
        case "array": 
            return chalk.white("[") + (val as any).elements.map((e: any) => stringify(e)).join(chalk.white(", ")) + chalk.white("]");
        case "object": 
            const props = (Array.from((val as any).properties.entries()) as [string, any][])
                .map(([k, v]) => `${chalk.blue(k)}: ${stringify(v as any)}`)
                .join(chalk.white(", "));
            return chalk.white("{ ") + props + chalk.white(" }");
        case "function": return chalk.magenta("[Function]");
        case "native-fn": return chalk.magenta("[Native Function]");
        default: return JSON.stringify(val);
    }
}

function plainStringify(val: RuntimeVal): string {
    switch (val.type) {
        case "string": return (val as StringVal).value;
        case "number": return (val as any).value.toString();
        case "boolean": return (val as any).value.toString();
        case "null": return "null";
        case "array": 
            return "[" + (val as any).elements.map((e: any) => plainStringify(e)).join(", ") + "]";
        case "object": 
            const props = Array.from((val as any).properties.entries())
                .map((entry: any) => {
                    const [k, v] = entry;
                    return `${k}: ${plainStringify(v as any)}`;
                })
                .join(", ");
            return "{ " + props + " }";
        case "function": return "[Function]";
        case "native-fn": return "[Native Function]";
        default: return JSON.stringify(val);
    }
}

function jsToRuntimeVal(jsObj: any): RuntimeVal {
    if (jsObj === null) return MK_NULL();
    if (typeof jsObj === "number") return MK_NUMBER(jsObj);
    if (typeof jsObj === "string") return MK_STRING(jsObj);
    if (typeof jsObj === "boolean") return MK_BOOL(jsObj);
    if (Array.isArray(jsObj)) {
        return MK_ARRAY(jsObj.map(item => jsToRuntimeVal(item)));
    }
    if (typeof jsObj === "object") {
        const props = new Map<string, RuntimeVal>();
        for (const [key, value] of Object.entries(jsObj)) {
            props.set(key, jsToRuntimeVal(value));
        }
        return MK_OBJECT(props);
    }
    return MK_NULL();
}

function setupEnv() {
  const env = createGlobalEnv();
  
  // Standard Print
  env.declareVar("print", MK_NATIVE_FN((args, scope) => {
    const output = args.map(arg => plainStringify(arg)).join(" ");
    process.stdout.write(output + "\n");
    return MK_NULL();
  }), true);

  // Time
  env.declareVar("time", MK_NATIVE_FN((args, scope) => {
    return MK_NUMBER(Date.now());
  }), true);

  // Input
  env.declareVar("input", MK_NATIVE_FN((args, scope) => {
      const promptText = args.length > 0
          ? plainStringify(args[0])
          : "";
      const result = prompt(chalk.gray(promptText));
      return MK_STRING(result || "");
  }), true);

  // Type Conversions
  env.declareVar("num", MK_NATIVE_FN((args, scope) => {
      if (args.length === 0) return MK_NUMBER(0);
      const val = (args[0] as any).value;
      return MK_NUMBER(parseFloat(val) || 0);
  }), true);

  env.declareVar("str", MK_NATIVE_FN((args, scope) => {
      if (args.length === 0) return MK_STRING("");
      return MK_STRING(plainStringify(args[0]));
  }), true);

  env.declareVar("bool", MK_NATIVE_FN((args, scope) => {
      if (args.length === 0) return MK_BOOL(false);
      const val = (args[0] as any).value;
      return MK_BOOL(!!val);
  }), true);

  // Math Module
  const mathProps = new Map<string, RuntimeVal>();
  mathProps.set("sqrt", MK_NATIVE_FN((args) => MK_NUMBER(Math.sqrt((args[0] as any).value))));
  mathProps.set("abs", MK_NATIVE_FN((args) => MK_NUMBER(Math.abs((args[0] as any).value))));
  mathProps.set("random", MK_NATIVE_FN(() => MK_NUMBER(Math.random())));
  mathProps.set("pi", MK_NUMBER(Math.PI));
  mathProps.set("e", MK_NUMBER(Math.E));
  mathProps.set("sin", MK_NATIVE_FN((args) => MK_NUMBER(Math.sin((args[0] as any).value))));
  mathProps.set("cos", MK_NATIVE_FN((args) => MK_NUMBER(Math.cos((args[0] as any).value))));
  mathProps.set("tan", MK_NATIVE_FN((args) => MK_NUMBER(Math.tan((args[0] as any).value))));
  mathProps.set("floor", MK_NATIVE_FN((args) => MK_NUMBER(Math.floor((args[0] as any).value))));
  mathProps.set("ceil", MK_NATIVE_FN((args) => MK_NUMBER(Math.ceil((args[0] as any).value))));
  mathProps.set("round", MK_NATIVE_FN((args) => MK_NUMBER(Math.round((args[0] as any).value))));
  mathProps.set("pow", MK_NATIVE_FN((args) => MK_NUMBER(Math.pow((args[0] as any).value, (args[1] as any).value))));
  mathProps.set("min", MK_NATIVE_FN((args) => MK_NUMBER(Math.min(...args.map(a => (a as any).value)))));
  mathProps.set("max", MK_NATIVE_FN((args) => MK_NUMBER(Math.max(...args.map(a => (a as any).value)))));
  mathProps.set("log", MK_NATIVE_FN((args) => MK_NUMBER(Math.log((args[0] as any).value))));
  mathProps.set("log10", MK_NATIVE_FN((args) => MK_NUMBER(Math.log10((args[0] as any).value))));
  env.declareVar("Math", MK_OBJECT(mathProps), true);

  // String Module
  const stringProps = new Map<string, RuntimeVal>();
  stringProps.set("split", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const sep = args[1] ? (args[1] as any).value : "";
      return MK_ARRAY(str.split(sep).map((s: string) => MK_STRING(s)));
  }));
  stringProps.set("replace", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const target = (args[1] as any).value;
      const replacement = (args[2] as any).value;
      return MK_STRING(str.replace(target, replacement));
  }));
  stringProps.set("replaceAll", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const target = (args[1] as any).value;
      const replacement = (args[2] as any).value;
      return MK_STRING(str.split(target).join(replacement));
  }));
  stringProps.set("upper", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.toUpperCase())));
  stringProps.set("lower", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.toLowerCase())));
  stringProps.set("trim", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.trim())));
  stringProps.set("includes", MK_NATIVE_FN((args) => MK_BOOL((args[0] as any).value.includes((args[1] as any).value))));
  stringProps.set("slice", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const start = (args[1] as any).value;
      const end = args[2] ? (args[2] as any).value : undefined;
      return MK_STRING(str.slice(start, end));
  }));
  stringProps.set("indexOf", MK_NATIVE_FN((args) => MK_NUMBER((args[0] as any).value.indexOf((args[1] as any).value))));
  env.declareVar("String", MK_OBJECT(stringProps), true);

  // Array Module
  const arrayProps = new Map<string, RuntimeVal>();
  arrayProps.set("push", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      arr.push(args[1]);
      return MK_NUMBER(arr.length);
  }));
  arrayProps.set("pop", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      return arr.pop() || MK_NULL();
  }));
  arrayProps.set("join", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      const sep = args[1] ? (args[1] as any).value : ",";
      return MK_STRING(arr.map((e: any) => plainStringify(e)).join(sep));
  }));
  arrayProps.set("slice", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      const start = (args[1] as any).value;
      const end = args[2] ? (args[2] as any).value : undefined;
      return MK_ARRAY(arr.slice(start, end));
  }));
  arrayProps.set("reverse", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements.slice();
      return MK_ARRAY(arr.reverse());
  }));
  arrayProps.set("includes", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      const search = (args[1] as any).value;
      return MK_BOOL(arr.some((e: any) => e.value === search));
  }));
  arrayProps.set("indexOf", MK_NATIVE_FN((args) => {
      const arr = (args[0] as any).elements;
      const search = (args[1] as any).value;
      return MK_NUMBER(arr.findIndex((e: any) => e.value === search));
  }));
  env.declareVar("Array", MK_OBJECT(arrayProps), true);

  // Date Module
  const dateProps = new Map<string, RuntimeVal>();
  dateProps.set("now", MK_NATIVE_FN(() => MK_NUMBER(Date.now())));
  dateProps.set("parse", MK_NATIVE_FN((args) => MK_NUMBER(Date.parse((args[0] as any).value))));
  dateProps.set("toISO", MK_NATIVE_FN((args) => {
      const ms = args[0] ? (args[0] as any).value : Date.now();
      return MK_STRING(new Date(ms).toISOString());
  }));
  dateProps.set("toUTC", MK_NATIVE_FN((args) => {
      const ms = args[0] ? (args[0] as any).value : Date.now();
      return MK_STRING(new Date(ms).toUTCString());
  }));
  env.declareVar("Date", MK_OBJECT(dateProps), true);

  // Regex Module
  const regexProps = new Map<string, RuntimeVal>();
  regexProps.set("test", MK_NATIVE_FN((args) => {
      const pattern = (args[0] as any).value;
      const str = (args[1] as any).value;
      const flags = args[2] ? (args[2] as any).value : "";
      return MK_BOOL(new RegExp(pattern, flags).test(str));
  }));
  regexProps.set("match", MK_NATIVE_FN((args) => {
      const pattern = (args[0] as any).value;
      const str = (args[1] as any).value;
      const flags = args[2] ? (args[2] as any).value : "";
      const matches = str.match(new RegExp(pattern, flags));
      if (!matches) return MK_NULL();
      return MK_ARRAY(matches.map((m: string) => MK_STRING(m)));
  }));
  regexProps.set("replace", MK_NATIVE_FN((args) => {
      const pattern = (args[0] as any).value;
      const str = (args[1] as any).value;
      const replacement = (args[2] as any).value;
      const flags = args[3] ? (args[3] as any).value : "";
      return MK_STRING(str.replace(new RegExp(pattern, flags), replacement));
  }));
  env.declareVar("Regex", MK_OBJECT(regexProps), true);

  // Base64 Module
  const b64Props = new Map<string, RuntimeVal>();
  b64Props.set("encode", MK_NATIVE_FN((args) => MK_STRING(Buffer.from((args[0] as any).value).toString('base64'))));
  b64Props.set("decode", MK_NATIVE_FN((args) => MK_STRING(Buffer.from((args[0] as any).value, 'base64').toString('ascii'))));
  env.declareVar("Base64", MK_OBJECT(b64Props), true);

  // Console Module
  const consoleProps = new Map<string, RuntimeVal>();
  consoleProps.set("clear", MK_NATIVE_FN(() => { console.clear(); return MK_NULL(); }));
  consoleProps.set("error", MK_NATIVE_FN((args) => { console.error(chalk.red(plainStringify(args[0]))); return MK_NULL(); }));
  consoleProps.set("warn", MK_NATIVE_FN((args) => { console.warn(chalk.yellow(plainStringify(args[0]))); return MK_NULL(); }));
  env.declareVar("Console", MK_OBJECT(consoleProps), true);

  // Path Module
  const pathProps = new Map<string, RuntimeVal>();
  pathProps.set("join", MK_NATIVE_FN((args) => MK_STRING(path.join(...args.map(a => (a as any).value)))));
  pathProps.set("resolve", MK_NATIVE_FN((args) => MK_STRING(path.resolve(...args.map(a => (a as any).value)))));
  pathProps.set("basename", MK_NATIVE_FN((args) => MK_STRING(path.basename((args[0] as any).value))));
  pathProps.set("dirname", MK_NATIVE_FN((args) => MK_STRING(path.dirname((args[0] as any).value))));
  pathProps.set("extname", MK_NATIVE_FN((args) => MK_STRING(path.extname((args[0] as any).value))));
  env.declareVar("Path", MK_OBJECT(pathProps), true);

  // FS Module (Modular)
  const fsModule = createFSModule();
  env.declareVar("FS", fsModule, true);
  env.declareVar("File", fsModule, true);

  // Sys Module (Modular)
  env.declareVar("Sys", createSysModule(VERSION), true);

  // HTTP Module (Modular)
  env.declareVar("HTTP", createHTTPModule(), true);

  // Net Module
  const netProps = new Map<string, RuntimeVal>();
  netProps.set("ping", MK_NATIVE_FN((args) => {
      return MK_STRING("Reply from " + (args[0] as any).value + ": time=10ms");
  }));
  env.declareVar("Net", MK_OBJECT(netProps), true);

  // JSON Module
  const jsonProps = new Map<string, RuntimeVal>();
  jsonProps.set("stringify", MK_NATIVE_FN((args) => MK_STRING(JSON.stringify(plainStringify(args[0])))));
  jsonProps.set("parse", MK_NATIVE_FN((args) => {
      try {
          const jsObj = JSON.parse((args[0] as any).value);
          return jsToRuntimeVal(jsObj);
      } catch (e) { return MK_NULL(); }
  }));
  env.declareVar("JSON", MK_OBJECT(jsonProps), true);

  // Compatibility (Optional)
  env.declareVar("toInteger", env.lookupVar("num"), true);
  env.declareVar("toNumber", env.lookupVar("num"), true);
  env.declareVar("toString", env.lookupVar("str"), true);
  
  return env;
}

function reportError(err: any) {
    if (err instanceof NovaError) {
        console.log(chalk.red.bold(`\n${err.type}: ${err.message}`));
        
        const loc = err.location;
        console.log(chalk.gray(`  at ${loc.file}:${loc.line}:${loc.column}`));
        
        if (loc.source) {
            const lines = loc.source.split("\n");
            const startLine = Math.max(0, loc.line - 2);
            const endLine = Math.min(lines.length, loc.line + 1);
            
            console.log("");
            for (let i = startLine; i < endLine; i++) {
                const lineNum = i + 1;
                const lineContent = lines[i];
                const marker = lineNum === loc.line ? chalk.red(">") : chalk.gray("|");
                console.log(`  ${chalk.gray(lineNum)} ${marker} ${lineContent}`);
                
                if (lineNum === loc.line) {
                    const padding = " ".repeat(String(lineNum).length + 4 + (loc.column > 0 ? loc.column - 1 : 0));
                    console.log(padding + chalk.red("^"));
                }
            }
        }
    } else {
        console.log(chalk.red.bold("\n[System Error]"));
        console.log(chalk.red("Message: ") + (err instanceof Error ? err.message : err));
        if (err instanceof Error && err.stack) {
            console.log(chalk.gray(err.stack));
        }
    }

    console.log(chalk.gray("\n--- Diagnostic Information ---"));
    console.log(chalk.gray(`NovaScript: ${VERSION}`));
    console.log(chalk.gray(`OS: ${os.platform()} (${os.arch()})`));
    console.log(chalk.gray(`Node: ${process.version}`));
    console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}`));
    console.log();
}

// ─── Syntax Highlight for REPL Input Display ───────────────────────────────
function highlightSyntax(code: string): string {
    const keywords = ["let", "const", "global", "fn", "if", "else", "while", "for", "from", "to", "return", "include", "and", "or", "not", "is", "isnt", "true", "false", "null", "print"];
    let result = code;

    // Keywords
    const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    result = result.replace(kwRegex, (m) => chalk.magenta.bold(m));

    // Strings
    result = result.replace(/"[^"]*"/g, (m) => chalk.green(m));

    // Numbers
    result = result.replace(/\b(\d+(\.\d+)?)\b/g, (m) => chalk.yellow(m));

    // Comments
    result = result.replace(/#.*/g, (m) => chalk.gray(m));

    return result;
}

// ─── Detect if block is still open (unclosed braces) ──────────────────────
function isIncomplete(code: string): boolean {
    let braces = 0;
    let inStr = false;
    for (const ch of code) {
        if (ch === '"' && !inStr) { inStr = true; continue; }
        if (ch === '"' && inStr) { inStr = false; continue; }
        if (inStr) continue;
        if (ch === '{') braces++;
        if (ch === '}') braces--;
    }
    return braces > 0;
}

// ─── REPL Help ──────────────────────────────────────────────────────────────
function printReplHelp() {
    console.log("");
    console.log(chalk.cyan.bold("  NovaScript REPL Commands"));
    console.log(chalk.gray("  ─────────────────────────────────────────────────────"));
    console.log(`  ${chalk.yellow(".help")}       ${chalk.white("Show this help message")}`);
    console.log(`  ${chalk.yellow(".editor")}     ${chalk.white("Enter multi-line editor mode (finish with .run)")}`);
    console.log(`  ${chalk.yellow(".clear")}      ${chalk.white("Clear the terminal screen")}`);
    console.log(`  ${chalk.yellow(".reset")}      ${chalk.white("Reset the REPL state (clears all variables)")}`);
    console.log(`  ${chalk.yellow(".exit")}       ${chalk.white("Exit the REPL")}`);
    console.log("");
    console.log(chalk.cyan.bold("  Quick Reference"));
    console.log(chalk.gray("  ─────────────────────────────────────────────────────"));
    console.log(`  ${chalk.green("let x = 10")}           ${chalk.gray("# declare variable")}`);
    console.log(`  ${chalk.green("const PI = 3.14")}      ${chalk.gray("# declare constant")}`);
    console.log(`  ${chalk.green("global counter = 0")}   ${chalk.gray("# global variable")}`);
    console.log(`  ${chalk.green("fn add(a, b) { ... }")} ${chalk.gray("# define function")}`);
    console.log(`  ${chalk.green("print(\"hello\")")}       ${chalk.gray("# print output")}`);
    console.log("");
}

// ─── CLI Help ──────────────────────────────────────────────────────────────
function printCliHelp() {
    console.log("");
    console.log(chalk.cyan.bold("  NovaScript CLI " + VERSION));
    console.log(chalk.gray("  ─────────────────────────────────────────────────────────────────────"));
    console.log(`  ${chalk.yellow("nova")}                      ${chalk.white("Start the interactive REPL")}`);
    console.log(`  ${chalk.yellow("nova run")} ${chalk.green("<file.nv>")}       ${chalk.white("Run a NovaScript file")}`);
    console.log(`  ${chalk.yellow("nova <file.nv>")}            ${chalk.white("Run a NovaScript file (shorthand)")}`);
    console.log(`  ${chalk.yellow("nova version")}              ${chalk.white("Print the current version")}`);
    console.log(`  ${chalk.yellow("nova help")}                 ${chalk.white("Show this help message")}`);
    console.log(`  ${chalk.yellow("nova repl")}                 ${chalk.white("Start the interactive REPL explicitly")}`);
    console.log("");
    console.log(chalk.cyan.bold("  REPL Special Commands"));
    console.log(chalk.gray("  ─────────────────────────────────────────────────────────────────────"));
    console.log(`  ${chalk.yellow(".help")}                     ${chalk.white("Show REPL help")}`);
    console.log(`  ${chalk.yellow(".editor")}                   ${chalk.white("Enter multi-line editor (type .run to execute)")}`);
    console.log(`  ${chalk.yellow(".clear")}                    ${chalk.white("Clear screen")}`);
    console.log(`  ${chalk.yellow(".reset")}                    ${chalk.white("Reset all variables")}`);
    console.log(`  ${chalk.yellow(".exit")}                     ${chalk.white("Exit the REPL")}`);
    console.log("");
}

// ─── Run File ───────────────────────────────────────────────────────────────
function run(filename: string) {
    const parser = new Parser();
    const env = setupEnv();

    if (!fs.existsSync(filename)) {
        console.log(chalk.red.bold(`\nError: File not found: ${filename}`));
        process.exit(1);
        return;
    }

    const input = fs.readFileSync(filename, "utf-8");
    try {
        const program = parser.produceAST(input, filename);
        evaluate(program, env);
    } catch (e) {
        reportError(e);
        process.exit(1);
    }
}

// ─── Production REPL ─────────────────────────────────────────────────────────
function repl() {
    const parser = new Parser();
    let env = setupEnv();

    // Banner
    const v = chalk.hex("#C084FC").bold(VERSION);
    const sep = chalk.hex("#4C1D95")("━".repeat(48));
    console.log("");
    console.log("  " + sep);
    console.log("  " + chalk.hex("#7C3AED")("◆") + "  " + chalk.hex("#C084FC").bold("Nova") + chalk.white.bold("Script") + "  " + chalk.hex("#9D5CF6")("◆") + "  " + chalk.hex("#6D28D9")("Production REPL") + "  " + chalk.hex("#7C3AED")("◆") + "  " + v);
    console.log("  " + sep);
    console.log("  " + chalk.hex("#7C3AED")("▸") + " " + chalk.gray(".help") + chalk.hex("#4C1D95")("  •  ") + chalk.gray(".editor") + chalk.hex("#4C1D95")("  •  ") + chalk.gray(".reset") + chalk.hex("#4C1D95")("  •  ") + chalk.gray(".clear") + chalk.hex("#4C1D95")("  •  ") + chalk.gray(".exit"));
    console.log("");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.hex("#C084FC").bold("nova") + chalk.white(" ❯ "),
    });

    // Multiline state
    let multiLineBuffer = "";
    let editorMode = false;
    let continuationMode = false;

    const promptNormal = () => rl.setPrompt(chalk.hex("#C084FC").bold("nova") + chalk.white(" ❯ "));
    const promptContinue = () => rl.setPrompt(chalk.gray("  ... "));
    const promptEditor = () => rl.setPrompt(chalk.yellow("  ✏  "));

    rl.prompt();

    rl.on("line", (inputLine) => {
        const trimmed = inputLine.trim();

        // ─ Editor Mode ────────────────────────────────────────────────────
        if (editorMode) {
            if (trimmed === ".run") {
                editorMode = false;
                const code = multiLineBuffer.trim();
                multiLineBuffer = "";
                console.log(chalk.gray("\n── Running ──────────────────────────────"));
                if (code) {
                    try {
                        const program = parser.produceAST(code, "repl");
                        const result = evaluate(program, env);
                        if (result.type !== "null") console.log(stringify(result));
                    } catch (e) {
                        reportError(e);
                    }
                }
                console.log(chalk.gray("─────────────────────────────────────────\n"));
                promptNormal();
                rl.prompt();
                return;
            }
            if (trimmed === ".clear" || trimmed === ".cancel") {
                editorMode = false;
                multiLineBuffer = "";
                console.log(chalk.gray("  Editor cancelled.\n"));
                promptNormal();
                rl.prompt();
                return;
            }
            multiLineBuffer += inputLine + "\n";
            promptEditor();
            rl.prompt();
            return;
        }

        // ─ Continuation Mode (unclosed braces) ────────────────────────────
        if (continuationMode) {
            multiLineBuffer += "\n" + inputLine;
            if (!isIncomplete(multiLineBuffer)) {
                continuationMode = false;
                const code = multiLineBuffer.trim();
                multiLineBuffer = "";
                try {
                    const program = parser.produceAST(code, "repl");
                    const result = evaluate(program, env);
                    if (result.type !== "null") console.log(stringify(result));
                } catch (e) {
                    reportError(e);
                }
                promptNormal();
                rl.prompt();
            } else {
                promptContinue();
                rl.prompt();
            }
            return;
        }

        // ─ REPL Commands ──────────────────────────────────────────────────
        if (trimmed === ".exit" || trimmed === "exit") {
            console.log(chalk.gray("\n  Bye! 👋\n"));
            process.exit(0);
        }
        if (trimmed === ".help") {
            printReplHelp();
            rl.prompt();
            return;
        }
        if (trimmed === ".clear") {
            console.clear();
            rl.prompt();
            return;
        }
        if (trimmed === ".reset") {
            env = setupEnv();
            multiLineBuffer = "";
            console.log(chalk.green("  ✔ Environment reset.\n"));
            rl.prompt();
            return;
        }
        if (trimmed === ".editor") {
            editorMode = true;
            multiLineBuffer = "";
            console.log(chalk.yellow("\n  ── Editor Mode ──────────────────────────────────────\n  Enter multiple lines of code.\n  Type .run to execute, .cancel to abort.\n"));
            promptEditor();
            rl.prompt();
            return;
        }
        if (trimmed === "") {
            rl.prompt();
            return;
        }

        // ─ Auto-continuation for unclosed blocks ──────────────────────────
        if (isIncomplete(trimmed)) {
            continuationMode = true;
            multiLineBuffer = inputLine;
            promptContinue();
            rl.prompt();
            return;
        }

        // ─ Normal evaluate ─────────────────────────────────────────────────
        try {
            const program = parser.produceAST(trimmed, "repl");
            const result = evaluate(program, env);
            if (result.type !== "null") {
                console.log("  " + chalk.gray("⟵ ") + stringify(result));
            }
        } catch (e) {
            reportError(e);
        }

        rl.prompt();
    });

    rl.on("close", () => {
        console.log(chalk.gray("\n  Bye! 👋\n"));
        process.exit(0);
    });
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);

if (cliArgs.length === 0) {
    repl();
} else {
    const cmd = cliArgs[0];

    switch (cmd) {
        case "version":
        case "--version":
        case "-v":
            console.log(`\n  ${chalk.hex("#C084FC").bold("NovaScript")} ${chalk.white(VERSION)}\n  Node.js ${process.version} on ${os.platform()} ${os.arch()}\n`);
            break;

        case "help":
        case "--help":
        case "-h":
            printCliHelp();
            break;

        case "repl":
            repl();
            break;

        case "run":
            if (!cliArgs[1]) {
                console.log(chalk.red.bold("\n  Error: No file specified. Usage: nova run <file.nv>\n"));
                process.exit(1);
            }
            run(cliArgs[1]);
            break;

        default:
            // Assume it's a filename (backward compatible)
            if (cmd.endsWith(".nv") || cmd.endsWith(".nova") || fs.existsSync(cmd)) {
                run(cmd);
            } else {
                console.log(chalk.red.bold(`\n  Unknown command: ${cmd}`));
                console.log(chalk.gray("  Run 'nova help' for usage.\n"));
                process.exit(1);
            }
            break;
    }
}

