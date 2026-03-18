
import * as os from "os";
import { execSync } from "child_process";
import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NULL, MK_NUMBER, MK_OBJECT } from "../values";

export function createSysModule(version: string) {
    const sysProps = new Map<string, RuntimeVal>();
    
    sysProps.set("platform", MK_STRING(os.platform()));
    sysProps.set("arch", MK_STRING(os.arch()));
    sysProps.set("version", MK_STRING(version));
    sysProps.set("env", MK_NATIVE_FN((args) => {
        const key = (args[0] as any).value;
        const val = process.env[key];
        return val !== undefined ? MK_STRING(val) : MK_NULL();
    }));
    sysProps.set("uptime", MK_NATIVE_FN(() => MK_NUMBER(os.uptime())));
    sysProps.set("hostname", MK_NATIVE_FN(() => MK_STRING(os.hostname())));
    sysProps.set("totalmem", MK_NATIVE_FN(() => MK_NUMBER(os.totalmem())));
    sysProps.set("freemem", MK_NATIVE_FN(() => MK_NUMBER(os.freemem())));
    sysProps.set("exec", MK_NATIVE_FN((args) => {
        try {
            const output = execSync((args[0] as any).value).toString();
            return MK_STRING(output);
        } catch (e: any) {
            return MK_STRING(e.message);
        }
    }));
    sysProps.set("exit", MK_NATIVE_FN((args) => {
        process.exit((args[0] as any)?.value || 0);
    }));
    sysProps.set("time", MK_NATIVE_FN(() => MK_NUMBER(Date.now())));
    
    return MK_OBJECT(sysProps);
}
