
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

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;

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
        return MK_ARRAY(jsObj.map(item => jsToRuntimeVal(item, seen)));
    }
    
    const props = new Map<string, RuntimeVal>();
    
    const collectProperties = (obj: any) => {
        if (!obj || obj === Object.prototype || obj === Function.prototype) return;
        
        // Use getOwnPropertyNames to discover even non-enumerable members
        for (const key of Object.getOwnPropertyNames(obj)) {
            // Exclude standard JS noise and special properties
            if (key === "prototype" || key === "length" || key === "name" || 
                key === "caller" || key === "arguments" || key === "constructor") continue;
            
            if (props.has(key)) continue; // Already found in child/sibling

            try {
                props.set(key, jsToRuntimeVal(obj[key], seen));
            } catch (e) {
                // Ignore properties that can't be accessed (e.g., strict mode blockers)
            }
        }
        
        // Discover inherited properties from prototype chain
        collectProperties(Object.getPrototypeOf(obj));
    };

    if (typeof jsObj === "function") {
        const fn = MK_NATIVE_FN((args) => {
            const jsArgs = args.map(arg => {
                const val = (arg as any).value;
                return val !== undefined ? val : arg;
            });
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
