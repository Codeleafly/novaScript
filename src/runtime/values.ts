
// src/runtime/values.ts

import { Statement } from "../frontend/ast";
import Environment from "./environment";

export type ValueType = "null" | "number" | "boolean" | "object" | "native-fn" | "function" | "string" | "array" | "promise";

export interface RuntimeVal {
  type: ValueType;
  underlyingValue?: any; // For native JS bridging
}

export interface PromiseVal extends RuntimeVal {
    type: "promise";
    promise: Promise<RuntimeVal>;
}

export interface NullVal extends RuntimeVal {
  type: "null";
  value: null;
}

export interface BooleanVal extends RuntimeVal {
  type: "boolean";
  value: boolean;
}

export interface NumberVal extends RuntimeVal {
  type: "number";
  value: number;
}

export interface StringVal extends RuntimeVal {
    type: "string";
    value: string;
}

export interface ObjectVal extends RuntimeVal {
  type: "object";
  properties: Map<string, RuntimeVal>;
}

export interface ArrayVal extends RuntimeVal {
    type: "array";
    elements: RuntimeVal[];
}

export class ReturnException extends Error {
    value: RuntimeVal;
    constructor(value: RuntimeVal) {
        super("Return");
        this.value = value;
    }
}

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal | Promise<RuntimeVal>;

export interface NativeFnVal extends RuntimeVal {
  type: "native-fn";
  call: FunctionCall;
  properties: Map<string, RuntimeVal>;
}

export interface FunctionVal extends RuntimeVal {
    type: "function";
    name: string;
    parameters: string[];
    declarationEnv: Environment;
    body: Statement[];
    async: boolean;
}

export function MK_PROMISE(p: Promise<RuntimeVal>): PromiseVal {
    return { type: "promise", promise: p };
}

export function MK_NUMBER(n: number = 0): NumberVal {
  return { type: "number", value: n };
}

export function MK_NULL(): NullVal {
  return { type: "null", value: null };
}

export function MK_BOOL(b: boolean = true): BooleanVal {
  return { type: "boolean", value: b };
}

export function MK_STRING(s: string): StringVal {
    return { type: "string", value: s };
}

export function MK_NATIVE_FN(call: FunctionCall): NativeFnVal {
  return { type: "native-fn", call, properties: new Map() };
}

export function MK_OBJECT(properties: Map<string, RuntimeVal>): ObjectVal {
    return { type: "object", properties };
}

export function MK_ARRAY(elements: RuntimeVal[]): ArrayVal {
    return { type: "array", elements };
}

/**
 * Converts a NovaScript RuntimeVal back into a native JavaScript value.
 * This is used when passing NovaScript data to native functions or modules.
 */
export function runtimeToJsVal(val: RuntimeVal, fnWrapper?: (f: FunctionVal) => Function): any {
    if (val.underlyingValue !== undefined) return val.underlyingValue;

    switch (val.type) {
        case "number":
        case "string":
        case "boolean":
            return (val as any).value;
        case "null":
            return null;
        case "array":
            return (val as ArrayVal).elements.map(e => runtimeToJsVal(e, fnWrapper));
        case "object":
            const out: any = {};
            (val as ObjectVal).properties.forEach((v, k) => {
                out[k] = runtimeToJsVal(v, fnWrapper);
            });
            return out;
        case "promise":
            return (val as PromiseVal).promise;
        case "function":
            return fnWrapper ? fnWrapper(val as FunctionVal) : val;
        default:
            return val;
    }
}

/**
 * Converts a native JavaScript object/value into a NovaScript RuntimeVal.
 * This is crucial for bridging NPM modules into NovaScript.
 */
export function jsToRuntimeVal(jsObj: any, seen: Set<any> = new Set()): RuntimeVal {
    if (jsObj === null || jsObj === undefined) return MK_NULL();
    
    // Handle circular references
    if (typeof jsObj === "object" || typeof jsObj === "function") {
        if (seen.has(jsObj)) return MK_NULL();
        seen.add(jsObj);
    }

    if (typeof jsObj === "number") return MK_NUMBER(jsObj);
    if (typeof jsObj === "string") return MK_STRING(jsObj);
    if (typeof jsObj === "boolean") return MK_BOOL(jsObj);
    
    if (Array.isArray(jsObj)) {
        const arr = MK_ARRAY(jsObj.map(item => jsToRuntimeVal(item, seen)));
        arr.underlyingValue = jsObj;
        return arr;
    }
    
    const props = new Map<string, RuntimeVal>();
    
    const collectProperties = (obj: any) => {
        if (!obj || obj === Object.prototype || obj === Function.prototype) return;
        
        // Scan current level
        for (const key of Object.getOwnPropertyNames(obj)) {
            if (key === "prototype" || key === "length" || key === "name" || 
                key === "caller" || key === "arguments" || key === "constructor") continue;
            
            if (props.has(key)) continue;

            try {
                props.set(key, jsToRuntimeVal(obj[key], seen));
            } catch (e) {}
        }
        // Limit recursion depth for performance or rely on lazy resolution for prototype chain
    };

    if (typeof jsObj === "function") {
        const fn = MK_NATIVE_FN((args) => {
            const jsArgs = args.map(arg => runtimeToJsVal(arg));
            const result = jsObj(...jsArgs);
            return jsToRuntimeVal(result);
        });
        
        fn.underlyingValue = jsObj; // Store original for lazy resolution
        collectProperties(jsObj);
        fn.properties = props;
        return fn;
    }

    if (typeof jsObj === "object") {
        const obj = MK_OBJECT(props);
        obj.underlyingValue = jsObj; // Store original for lazy resolution
        collectProperties(jsObj);
        return obj;
    }
    
    return MK_NULL();
}

/**
 * Returns a plain string representation of a RuntimeVal without colors.
 */
export function plainStringify(val: RuntimeVal): string {
    switch (val.type) {
        case "string": return (val as any).value;
        case "number": return (val as any).value.toString();
        case "boolean": return (val as any).value.toString();
        case "null": return "null";
        case "promise": return "[Promise]";
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
