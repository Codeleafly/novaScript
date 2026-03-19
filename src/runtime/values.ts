
// src/runtime/values.ts

import { Statement } from "../frontend/ast";
import Environment from "./environment";

export type ValueType = "null" | "number" | "boolean" | "object" | "native-fn" | "function" | "string" | "array" | "promise";

export interface RuntimeVal {
  type: ValueType;
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
  return { type: "native-fn", call };
}

export function MK_OBJECT(properties: Map<string, RuntimeVal>): ObjectVal {
    return { type: "object", properties };
}

export function MK_ARRAY(elements: RuntimeVal[]): ArrayVal {
    return { type: "array", elements };
}
