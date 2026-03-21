import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NUMBER, MK_OBJECT, MK_ARRAY, MK_NULL, plainStringify, ArrayVal, FunctionVal, NativeFnVal, ReturnException } from "../values";
import * as interpreter from "../interpreter";
import Environment from "../environment";

async function callRuntimeFn(fn: RuntimeVal, args: RuntimeVal[], env: Environment): Promise<RuntimeVal> {
    if (fn.type === "native-fn") {
        return await (fn as NativeFnVal).call(args, env);
    } else if (fn.type === "function") {
        const func = fn as FunctionVal;
        const scope = new Environment(func.declarationEnv, "function");
        for (let i = 0; i < func.parameters.length; i++) {
            scope.declareVar(func.parameters[i], args[i] || MK_NULL(), false);
        }
        let result: RuntimeVal = MK_NULL();
        try {
            for (const stmt of func.body) {
                result = await interpreter.evaluate(stmt, scope);
            }
        } catch (e) {
            if (e instanceof ReturnException) result = e.value;
            else throw e;
        }
        return result;
    }
    return MK_NULL();
}

export function createArrayModule() {
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

  // Higher-order functions
  arrayProps.set("forEach", MK_NATIVE_FN(async (args, env) => {
      const arr = (args[0] as ArrayVal).elements;
      const callback = args[1];
      for (let i = 0; i < arr.length; i++) {
          await callRuntimeFn(callback, [arr[i], MK_NUMBER(i), args[0]], env);
      }
      return MK_NULL();
  }));

  arrayProps.set("map", MK_NATIVE_FN(async (args, env) => {
      const arr = (args[0] as ArrayVal).elements;
      const callback = args[1];
      const result: RuntimeVal[] = [];
      for (let i = 0; i < arr.length; i++) {
          result.push(await callRuntimeFn(callback, [arr[i], MK_NUMBER(i), args[0]], env));
      }
      return MK_ARRAY(result);
  }));

  arrayProps.set("filter", MK_NATIVE_FN(async (args, env) => {
      const arr = (args[0] as ArrayVal).elements;
      const callback = args[1];
      const result: RuntimeVal[] = [];
      for (let i = 0; i < arr.length; i++) {
          const res = await callRuntimeFn(callback, [arr[i], MK_NUMBER(i), args[0]], env);
          if (res.type === "boolean" && (res as any).value) {
              result.push(arr[i]);
          }
      }
      return MK_ARRAY(result);
  }));

  arrayProps.set("find", MK_NATIVE_FN(async (args, env) => {
      const arr = (args[0] as ArrayVal).elements;
      const callback = args[1];
      for (let i = 0; i < arr.length; i++) {
          const res = await callRuntimeFn(callback, [arr[i], MK_NUMBER(i), args[0]], env);
          if (res.type === "boolean" && (res as any).value) {
              return arr[i];
          }
      }
      return MK_NULL();
  }));

  arrayProps.set("reduce", MK_NATIVE_FN(async (args, env) => {
      const arr = (args[0] as ArrayVal).elements;
      const callback = args[1];
      let accumulator = args.length > 2 ? args[2] : arr[0];
      let startIndex = args.length > 2 ? 0 : 1;
      
      for (let i = startIndex; i < arr.length; i++) {
          accumulator = await callRuntimeFn(callback, [accumulator, arr[i], MK_NUMBER(i), args[0]], env);
      }
      return accumulator;
  }));
  
  return MK_OBJECT(arrayProps);
}
