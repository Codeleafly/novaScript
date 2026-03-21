import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NULL, MK_NUMBER, MK_OBJECT, MK_ARRAY, jsToRuntimeVal, plainStringify, runtimeToJsVal } from "../values";
import * as path from "path";
import chalk from "chalk";

export function createUtilModules() {
    const modules: Record<string, RuntimeVal> = {};

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
    dateProps.set("format", MK_NATIVE_FN((args) => {
        const ms = args[0] ? (args[0] as any).value : Date.now();
        const fmt = args[1] ? (args[1] as any).value : "YYYY-MM-DD HH:mm:ss";
        const date = new Date(ms);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const map: Record<string, string> = {
            "YYYY": date.getFullYear().toString(),
            "MM": pad(date.getMonth() + 1),
            "DD": pad(date.getDate()),
            "HH": pad(date.getHours()),
            "mm": pad(date.getMinutes()),
            "ss": pad(date.getSeconds()),
        };
        let result = fmt;
        for (const [k, v] of Object.entries(map)) {
            result = result.replace(k, v);
        }
        return MK_STRING(result);
    }));
    dateProps.set("diff", MK_NATIVE_FN((args) => {
        const ms1 = (args[0] as any).value;
        const ms2 = (args[1] as any).value;
        return MK_NUMBER(ms1 - ms2);
    }));
    modules["Date"] = MK_OBJECT(dateProps);

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
    modules["Regex"] = MK_OBJECT(regexProps);

    // Base64 Module
    const b64Props = new Map<string, RuntimeVal>();
    b64Props.set("encode", MK_NATIVE_FN((args) => MK_STRING(Buffer.from((args[0] as any).value).toString('base64'))));
    b64Props.set("decode", MK_NATIVE_FN((args) => MK_STRING(Buffer.from((args[0] as any).value, 'base64').toString('ascii'))));
    modules["Base64"] = MK_OBJECT(b64Props);

    // Console Module
    const consoleProps = new Map<string, RuntimeVal>();
    consoleProps.set("clear", MK_NATIVE_FN(() => { console.clear(); return MK_NULL(); }));
    consoleProps.set("error", MK_NATIVE_FN((args) => { console.error(chalk.red(plainStringify(args[0]))); return MK_NULL(); }));
    consoleProps.set("warn", MK_NATIVE_FN((args) => { console.warn(chalk.yellow(plainStringify(args[0]))); return MK_NULL(); }));
    modules["Console"] = MK_OBJECT(consoleProps);

    // Path Module
    const pathProps = new Map<string, RuntimeVal>();
    pathProps.set("join", MK_NATIVE_FN((args) => MK_STRING(path.join(...args.map(a => (a as any).value)))));
    pathProps.set("resolve", MK_NATIVE_FN((args) => MK_STRING(path.resolve(...args.map(a => (a as any).value)))));
    pathProps.set("basename", MK_NATIVE_FN((args) => MK_STRING(path.basename((args[0] as any).value))));
    pathProps.set("dirname", MK_NATIVE_FN((args) => MK_STRING(path.dirname((args[0] as any).value))));
    pathProps.set("extname", MK_NATIVE_FN((args) => MK_STRING(path.extname((args[0] as any).value))));
    modules["Path"] = MK_OBJECT(pathProps);

    // JSON Module
    const jsonProps = new Map<string, RuntimeVal>();
    jsonProps.set("stringify", MK_NATIVE_FN((args) => MK_STRING(JSON.stringify(runtimeToJsVal(args[0])))));
    jsonProps.set("parse", MK_NATIVE_FN((args) => {
        try {
            const jsObj = JSON.parse((args[0] as any).value);
            return jsToRuntimeVal(jsObj);
        } catch (e) { return MK_NULL(); }
    }));
    modules["JSON"] = MK_OBJECT(jsonProps);

    // Net Module
    const netProps = new Map<string, RuntimeVal>();
    netProps.set("ping", MK_NATIVE_FN((args) => {
        return MK_STRING("Reply from " + (args[0] as any).value + ": time=10ms");
    }));
    modules["Net"] = MK_OBJECT(netProps);

    return modules;
}
