#!/usr/bin/env node
// src/main.ts
import Parser from "./frontend/parser";
import { evaluate } from "./runtime/interpreter";
import { createGlobalEnv } from "./runtime/environment";
import { MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_STRING, MK_BOOL, MK_OBJECT, RuntimeVal, StringVal } from "./runtime/values";
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
const VERSION = "v5.0.0";

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
          ? (args[0] as any).value.toString()
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
      const val = (args[0] as any).value;
      return MK_STRING(val.toString());
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
  mathProps.set("random", MK_NATIVE_FN((args) => MK_NUMBER(Math.random())));
  mathProps.set("pi", MK_NUMBER(Math.PI));
  mathProps.set("sin", MK_NATIVE_FN((args) => MK_NUMBER(Math.sin((args[0] as any).value))));
  mathProps.set("cos", MK_NATIVE_FN((args) => MK_NUMBER(Math.cos((args[0] as any).value))));
  mathProps.set("floor", MK_NATIVE_FN((args) => MK_NUMBER(Math.floor((args[0] as any).value))));
  mathProps.set("ceil", MK_NATIVE_FN((args) => MK_NUMBER(Math.ceil((args[0] as any).value))));
  mathProps.set("pow", MK_NATIVE_FN((args) => MK_NUMBER(Math.pow((args[0] as any).value, (args[1] as any).value))));
  
  env.declareVar("Math", MK_OBJECT(mathProps), true);

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

  // JSON Module
  const jsonProps = new Map<string, RuntimeVal>();
  jsonProps.set("stringify", MK_NATIVE_FN((args) => MK_STRING(JSON.stringify(plainStringify(args[0])))));
  jsonProps.set("parse", MK_NATIVE_FN((args) => {
      try {
          const obj = JSON.parse((args[0] as any).value);
          // Very basic conversion back to RuntimeVal could be added here
          return MK_STRING(JSON.stringify(obj)); 
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

function run(filename: string) {
  const parser = new Parser();
  const env = setupEnv();

  if (!fs.existsSync(filename)) {
      console.log(chalk.red.bold(`\nError: File not found: ${filename}`));
      return;
  }

  const input = fs.readFileSync(filename, "utf-8");
  try {
      const program = parser.produceAST(input, filename);
      evaluate(program, env);
  } catch (e) {
      reportError(e);
  }
}

function repl() {
  const parser = new Parser();
  const env = setupEnv();
  
  console.log(chalk.blue.bold("-----------------------------------------"));
  console.log(chalk.blue.bold(`   NovaScript Interactive REPL ${VERSION}    `));
  console.log(chalk.blue.bold("-----------------------------------------"));
  console.log(chalk.gray("Type 'exit' or press Ctrl+C to quit."));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan.bold("➜ "),
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
        const result = evaluate(program, env);
        if (result.type !== "null") {
             console.log(stringify(result));
        }
    } catch (e) {
        reportError(e);
    }
    
    rl.prompt();
  });
}

const args = process.argv;
if (args.length > 2) {
    const filename = args[2];
    run(filename);
} else {
    repl();
}
