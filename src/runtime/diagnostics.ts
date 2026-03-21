
// src/runtime/diagnostics.ts
// Unified Diagnostics System for NovaScript v6.1.0-dev

import chalk from "chalk";
import boxen from "boxen";
import * as os from "os";
import { NovaError, ErrorType } from "./errors";

const ERROR_ICONS: Record<string, string> = {
    [ErrorType.SyntaxError]: "✘",
    [ErrorType.TypeError]: "⚠",
    [ErrorType.ReferenceError]: "?",
    [ErrorType.RuntimeError]: "✘",
    [ErrorType.ImportError]: "⬇",
    [ErrorType.ValueError]: "✘",
    [ErrorType.ZeroDivisionError]: "÷",
};

const ERROR_COLORS: Record<string, any> = {
    [ErrorType.SyntaxError]: chalk.red,
    [ErrorType.TypeError]: chalk.yellow,
    [ErrorType.ReferenceError]: chalk.magenta,
    [ErrorType.RuntimeError]: chalk.red,
    [ErrorType.ImportError]: chalk.cyan,
    [ErrorType.ValueError]: chalk.red,
    [ErrorType.ZeroDivisionError]: chalk.red,
};

export class Diagnostics {
    private version: string;

    constructor(version: string) {
        this.version = version;
    }

    /**
     * Reports a NovaError or generic JS Error with premium formatting.
     */
    report(err: any): void {
        console.log("");

        if (err instanceof NovaError) {
            this.reportNovaError(err);
        } else {
            this.reportSystemError(err);
        }
    }

    private reportNovaError(err: NovaError): void {
        const icon = ERROR_ICONS[err.type] || "✘";
        const colorFn = ERROR_COLORS[err.type] || chalk.red;

        // Header Title
        const headerTitle = colorFn.bold(`${icon} ${err.type}`);
        
        // Location Info
        const loc = err.location;
        let content = `${chalk.whiteBright(err.message)}\n\n${chalk.gray(`File: ${loc.file}:${loc.line}:${loc.column}`)}\n`;

        // Source code snippet (10 lines total)
        if (loc.source) {
            const lines = loc.source.split("\n");
            const startLine = Math.max(0, loc.line - 6);
            const endLine = Math.min(lines.length, loc.line + 4);

            content += chalk.gray("─".repeat(50)) + "\n";

            for (let i = startLine; i < endLine; i++) {
                const lineNum = i + 1;
                const lineContent = lines[i];
                const numStr = String(lineNum).padStart(4, " ");

                if (lineNum === loc.line) {
                    // Error line highlighted
                    content += colorFn.bold(` ${numStr} | `) + chalk.whiteBright(lineContent) + "\n";
                    // Caret pointer underneath
                    const caretPad = " ".repeat(Math.max(0, loc.column - 1));
                    content += chalk.gray(`      | `) + colorFn.bold(`${caretPad}^── ${err.message}`) + "\n";
                } else {
                    // Normal context line
                    content += chalk.gray(` ${numStr} | ${lineContent}`) + "\n";
                }
            }
        }

        const diagnosticInfo = `\nNovaScript ${this.version} | ${os.platform()} ${os.arch()} | Node ${process.version}\n${new Date().toLocaleString()}`;
        content += chalk.gray("─".repeat(50)) + "\n" + chalk.dim(diagnosticInfo);

        console.log(
            boxen(content, {
                title: headerTitle,
                titleAlignment: "left",
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "gray",
            })
        );
    }

    private reportSystemError(err: any): void {
        const headerTitle = chalk.red.bold("✘ System Error");
        let content = chalk.white(err instanceof Error ? err.message : String(err));

        if (err instanceof Error && err.stack) {
            content += "\n\n" + chalk.gray(err.stack.split("\n").slice(1, 5).map(s => s.trim()).join("\n"));
        }

        console.log(
            boxen(content, {
                title: headerTitle,
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "red",
            })
        );
    }
}
