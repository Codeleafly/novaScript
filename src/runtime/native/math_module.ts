
import { RuntimeVal, MK_NATIVE_FN, MK_NUMBER, MK_OBJECT } from "../values";

export function createMathModule() {
  const mathProps = new Map<string, RuntimeVal>();
  mathProps.set("sqrt", MK_NATIVE_FN((args) => MK_NUMBER(Math.sqrt((args[0] as any).value))));
  mathProps.set("abs", MK_NATIVE_FN((args) => MK_NUMBER(Math.abs((args[0] as any).value))));
  mathProps.set("random", MK_NATIVE_FN(() => MK_NUMBER(Math.random())));
  mathProps.set("pi", MK_NUMBER(Math.PI));
  mathProps.set("e", MK_NUMBER(Math.E));
  mathProps.set("sin", MK_NATIVE_FN((args) => MK_NUMBER(Math.sin((args[0] as any).value))));
  mathProps.set("cos", MK_NATIVE_FN((args) => MK_NUMBER(Math.cos((args[0] as any).value))));
  mathProps.set("tan", MK_NATIVE_FN((args) => MK_NUMBER(Math.tan((args[0] as any).value))));
  mathProps.set("floor", MK_NATIVE_FN((args) => MK_NUMBER(Math.floor((args[0] as any).value))));
  mathProps.set("ceil", MK_NATIVE_FN((args) => MK_NUMBER(Math.ceil((args[0] as any).value))));
  mathProps.set("round", MK_NATIVE_FN((args) => MK_NUMBER(Math.round((args[0] as any).value))));
  mathProps.set("pow", MK_NATIVE_FN((args) => MK_NUMBER(Math.pow((args[0] as any).value, (args[1] as any).value))));
  mathProps.set("min", MK_NATIVE_FN((args) => MK_NUMBER(Math.min(...args.map(a => (a as any).value)))));
  mathProps.set("max", MK_NATIVE_FN((args) => MK_NUMBER(Math.max(...args.map(a => (a as any).value)))));
  mathProps.set("log", MK_NATIVE_FN((args) => MK_NUMBER(Math.log((args[0] as any).value))));
  mathProps.set("log10", MK_NATIVE_FN((args) => MK_NUMBER(Math.log10((args[0] as any).value))));
  mathProps.set("inf", MK_NUMBER(Infinity));
  mathProps.set("nan", MK_NUMBER(NaN));
  mathProps.set("trunc", MK_NATIVE_FN((args) => MK_NUMBER(Math.trunc((args[0] as any).value))));
  mathProps.set("sign", MK_NATIVE_FN((args) => MK_NUMBER(Math.sign((args[0] as any).value))));
  
  return MK_OBJECT(mathProps);
}
