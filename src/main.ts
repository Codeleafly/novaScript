#!/usr/bin/env node
// src/main.ts
import Parser from "./frontend/parser";
import { evaluate } from "./runtime/interpreter";
import Environment, { createGlobalEnv } from "./runtime/environment";
import { MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_STRING, MK_BOOL, MK_OBJECT, MK_ARRAY, RuntimeVal, StringVal, jsToRuntimeVal, plainStringify } from "./runtime/values";
import { NovaError, ErrorLocation, ErrorType } from "./runtime/errors";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import chalk from "chalk";
import promptSync from "prompt-sync";

// Native Modules
import { createFSModule } from "./runtime/native/fs_module";
import { createHTTPModule } from "./runtime/native/http_module";
import { createSysModule } from "./runtime/native/sys_module";
import { createMathModule } from "./runtime/native/math_module";
import { createStringModule } from "./runtime/native/string_module";
import { createArrayModule } from "./runtime/native/array_module";
import { createUtilModules } from "./runtime/native/util_modules";
import { Diagnostics } from "./runtime/diagnostics";

const prompt = promptSync({ sigint: true });
const VERSION = "v6.1.1-dev";
const diagnostics = new Diagnostics(VERSION);

function stringify(val: RuntimeVal): string {
    switch (val.type) {
        case "string": return chalk.green(`${(val as StringVal).value}`);
        case "number": return chalk.yellow((val as any).value.toString());
        case "boolean": return chalk.cyan((val as any).value.toString());
        case "null": return chalk.gray("null");
        case "promise": return chalk.blue("[Promise]");
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


/**
 * Global Dependency pre-fetcher (pre-requisite for v6.0.0)
 */
async function getDependency(source: string) {
    try {
        const LibraryManager = (await import("./runtime/library_manager")).LibraryManager;
        await LibraryManager.resolve(source);
    } catch (e: any) {
        throw e;
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

  // Modular Library Registry
  env.declareVar("Math", createMathModule(), true);
  env.declareVar("String", createStringModule(), true);
  env.declareVar("Array", createArrayModule(), true);

  // Utility Modules
  const utils = createUtilModules();
  for (const [name, mod] of Object.entries(utils)) {
      env.declareVar(name, mod, true);
  }

  // FS Module (Modular)
  const fsModule = createFSModule();
  env.declareVar("FS", fsModule, true);
  env.declareVar("File", fsModule, true);

  // Sys Module (Modular)
  env.declareVar("Sys", createSysModule(VERSION), true);

  // HTTP Module (Modular)
  env.declareVar("HTTP", createHTTPModule(), true);

  // Compatibility (Optional)
  env.declareVar("toInteger", env.lookupVar("num"), true);
  env.declareVar("toNumber", env.lookupVar("num"), true);
  env.declareVar("toString", env.lookupVar("str"), true);
  
  // ─── v6.0.5-dev Global Helpers ───────────────────────────────────────
  env.declareVar("openUrl", MK_NATIVE_FN((args) => {
      const url = (args[0] as any).value;
      const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      try { execSync(`${cmd} ${url}`); } catch (e) {}
      return MK_NULL();
  }), true);

  env.declareVar("parseJson", MK_NATIVE_FN((args) => {
      try {
          return jsToRuntimeVal(JSON.parse((args[0] as any).value));
      } catch (e) { return MK_NULL(); }
  }), true);

  env.declareVar("watchFile", MK_NATIVE_FN((args, env) => {
      const filePath = (args[0] as any).value;
      const callback = args[1] as any;
      if (callback.type !== "function") return MK_NULL();
      
      fs.watch(filePath, (event: string, filename: string | null) => {
          const scope = new Environment(callback.declarationEnv, "function");
          scope.declareVar("event", MK_STRING(event), true);
          scope.declareVar("filename", MK_STRING(filename || ""), true);
          evaluate({ kind: "Program", body: callback.body } as any, scope).catch(e => console.error(e));
      });
      return MK_NULL();
  }), true);

  env.declareVar("fetchText", MK_NATIVE_FN((args) => {
      const url = (args[0] as any).value;
      const httpModule = env.lookupVar("HTTP") as any;
      const getFn = httpModule.properties.get("get") as any;
      const res = getFn.call([MK_STRING(url)], env);
      if (res.type === "object") {
          return res.properties.get("data") || MK_NULL();
      }
      return MK_NULL();
  }), true);

  return env;
}

function reportError(err: any) {
    diagnostics.report(err);
}

// ─── Syntax Highlight for REPL Input Display ───────────────────────────────
function highlightSyntax(code: string): string {
    const keywords = [
        "let", "const", "global", "fn", "if", "else", "while", "for", "from", "to", 
        "return", "include", "and", "or", "not", "is", "isnt", "true", "false", "null", 
        "print", "async", "await", "try", "catch", "finally", "throw", "switch", 
        "case", "default", "break", "continue"
    ];
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
    console.log(chalk.cyan.bold(`  NovaScript CLI ${VERSION} (v0.1.0)`));
    console.log(chalk.gray("  ─────────────────────────────────────────────────────────────────────"));
    console.log(`  ${chalk.yellow("nova")}                      ${chalk.white("Start the interactive REPL")}`);
    console.log(`  ${chalk.yellow("nova run")} ${chalk.green("<file.nv>")}       ${chalk.white("Run a NovaScript file")}`);
    console.log(`  ${chalk.yellow("nova <file.nv>")}            ${chalk.white("Run a NovaScript file (shorthand)")}`);
    console.log(`  ${chalk.yellow("nova get")} ${chalk.green("<source>")}        ${chalk.white("Pre-fetch a global dependency (npm:, github:, https:)")}`);
    console.log(`  ${chalk.yellow("nova clean")}                ${chalk.white("Clear the global library cache (~/.nova_libs)")}`);
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
async function run(filename: string) {
    const parser = new Parser();
    const env = setupEnv();

    const absolutePath = path.resolve(filename);
    if (!fs.existsSync(absolutePath)) {
        console.log(chalk.red.bold(`\nError: File not found: ${filename}`));
        process.exit(1);
        return;
    }

    const input = fs.readFileSync(absolutePath, "utf-8");
    try {
        const program = parser.produceAST(input, absolutePath);
        await evaluate(program, env);
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
    const v = chalk.hex("#D8B4FE").bold(VERSION);
    const sep = chalk.hex("#6D28D9")("━".repeat(48));
    console.log("");
    console.log("  " + sep);
    console.log("  " + chalk.hex("#A78BFA")("✧") + "  " + chalk.hex("#C084FC").bold("Nova") + chalk.white.bold("Script") + "  " + chalk.hex("#A78BFA")("✧") + "  " + v);
    console.log("  " + sep);
    console.log("  " + chalk.hex("#9D5CF6")("▸") + " " + chalk.gray(".help") + chalk.hex("#7C3AED")("  •  ") + chalk.gray(".editor") + chalk.hex("#7C3AED")("  •  ") + chalk.gray(".reset") + chalk.hex("#7C3AED")("  •  ") + chalk.gray(".clear") + chalk.hex("#7C3AED")("  •  ") + chalk.gray(".exit"));
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

    rl.on("line", async (inputLine) => {
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
                        const result = await evaluate(program, env);
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
                    const result = await evaluate(program, env);
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
            const result = await evaluate(program, env);
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
            run(cliArgs[1]).catch(e => {
                reportError(e);
                process.exit(1);
            });
            break;

        case "get":
            if (!cliArgs[1]) {
                console.log(chalk.red.bold("\n  Error: No source specified. Usage: nova get <source>\n"));
                process.exit(1);
            }
            getDependency(cliArgs[1]).then(() => {
                process.exit(0);
            }).catch(e => {
                console.log(chalk.red.bold(`\n  Import Error: ${e.message}\n`));
                process.exit(1);
            });
            break;

        case "install":
        case "i":
            if (!cliArgs[1]) {
                console.log(chalk.red.bold("\n  Error: No source specified. Usage: nova install [-g] <source>\n"));
                process.exit(1);
            }
            
            let isGlobal = false;
            let sourceIndex = 1;
            
            if (cliArgs[1] === "-g" || cliArgs[1] === "--global") {
                isGlobal = true;
                sourceIndex = 2;
            } else if (cliArgs[2] === "-g" || cliArgs[2] === "--global") {
                isGlobal = true;
            }

            const source = cliArgs[sourceIndex];
            if (!source) {
                console.log(chalk.red.bold("\n  Error: No source specified. Usage: nova install [-g] <source>\n"));
                process.exit(1);
            }

            import("./runtime/library_manager").then(m => {
                if (isGlobal) {
                    m.LibraryManager.installGlobal(source).catch(e => {
                        console.log(chalk.red.bold(`\n  Global Install Error: ${e.message}\n`));
                        process.exit(1);
                    });
                } else {
                    // Local fallback/get
                    console.log(chalk.yellow("\n  Note: Local install currently aliases to 'get'. Use -g for global executable.\n"));
                    import("./runtime/interpreter").then(intp => {
                        m.LibraryManager.resolve(source).then(() => {
                            console.log(chalk.green(`\n  ✔ Fetched ${source}\n`));
                            process.exit(0);
                        }).catch(e => {
                            console.log(chalk.red.bold(`\n  Import Error: ${e.message}\n`));
                            process.exit(1);
                        });
                    });
                }
            });
            break;

        case "clean":
            import("./runtime/library_manager").then(m => {
                m.LibraryManager.clean();
                process.exit(0);
            });
            break;

        default:
            // Assume it's a filename (backward compatible)
            if (cmd.endsWith(".nv") || cmd.endsWith(".nova") || cmd.endsWith(".ns") || fs.existsSync(cmd)) {
                run(cmd).catch(e => {
                    reportError(e);
                    process.exit(1);
                });
            } else {
                console.log(chalk.red.bold(`\n  Unknown command: ${cmd}`));
                console.log(chalk.gray("  Run 'nova help' for usage.\n"));
                process.exit(1);
            }
            break;
    }
}

