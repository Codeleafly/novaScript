
import * as fs from "fs";
import * as path from "path";
import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NULL, MK_NUMBER, MK_OBJECT, MK_ARRAY } from "../values";

export function createFSModule() {
    const fsProps = new Map<string, RuntimeVal>();

    // Basic Read/Write
    fsProps.set("read", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value;
        if (!fs.existsSync(p)) return MK_NULL();
        return MK_STRING(fs.readFileSync(p, "utf-8"));
    }));

    fsProps.set("write", MK_NATIVE_FN((args) => {
        fs.writeFileSync((args[0] as any).value, (args[1] as any).value);
        return MK_BOOL(true);
    }));

    fsProps.set("append", MK_NATIVE_FN((args) => {
        fs.appendFileSync((args[0] as any).value, (args[1] as any).value);
        return MK_BOOL(true);
    }));

    // Advanced Operations
    fsProps.set("copy", MK_NATIVE_FN((args) => {
        const src = (args[0] as any).value;
        const dest = (args[1] as any).value;
        const recursive = (args[2] as any)?.value ?? true;
        fs.cpSync(src, dest, { recursive });
        return MK_BOOL(true);
    }));

    fsProps.set("move", MK_NATIVE_FN((args) => {
        const src = (args[0] as any).value;
        const dest = (args[1] as any).value;
        fs.renameSync(src, dest);
        return MK_BOOL(true);
    }));

    fsProps.set("rename", MK_NATIVE_FN((args) => {
        const oldPath = (args[0] as any).value;
        const newPath = (args[1] as any).value;
        fs.renameSync(oldPath, newPath);
        return MK_BOOL(true);
    }));

    fsProps.set("delete", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value;
        const recursive = (args[1] as any)?.value ?? true;
        fs.rmSync(p, { recursive, force: true });
        return MK_BOOL(true);
    }));

    fsProps.set("exists", MK_NATIVE_FN((args) => MK_BOOL(fs.existsSync((args[0] as any).value))));
    
    fsProps.set("mkdir", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value;
        fs.mkdirSync(p, { recursive: true });
        return MK_BOOL(true);
    }));

    fsProps.set("rmdir", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value;
        fs.rmSync(p, { recursive: true, force: true });
        return MK_BOOL(true);
    }));

    fsProps.set("isFile", MK_NATIVE_FN((args) => MK_BOOL(fs.statSync((args[0] as any).value).isFile())));
    fsProps.set("isDir", MK_NATIVE_FN((args) => MK_BOOL(fs.statSync((args[0] as any).value).isDirectory())));

    // List and Search
    fsProps.set("list", MK_NATIVE_FN((args) => {
        const dir = (args[0] as any).value;
        const files = fs.readdirSync(dir);
        return MK_ARRAY(files.map(f => MK_STRING(f)));
    }));

    fsProps.set("search", MK_NATIVE_FN((args) => {
        const pattern = (args[0] as any).value;
        const startDir = (args[1] as any)?.value || ".";
        const recursive = (args[2] as any)?.value ?? true;
        
        const results: string[] = [];
        const walk = (dir: string) => {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const fullPath = path.join(dir, file);
                if (file.includes(pattern)) results.push(fullPath);
                if (recursive && fs.statSync(fullPath).isDirectory()) {
                    walk(fullPath);
                }
            }
        };
        
        walk(startDir);
        return MK_ARRAY(results.map(r => MK_STRING(r)));
    }));

    return MK_OBJECT(fsProps);
}
