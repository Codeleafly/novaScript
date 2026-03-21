
import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NUMBER, MK_OBJECT, MK_ARRAY } from "../values";

export function createStringModule() {
  const stringProps = new Map<string, RuntimeVal>();
  stringProps.set("split", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const sep = args[1] ? (args[1] as any).value : "";
      return MK_ARRAY(str.split(sep).map((s: string) => MK_STRING(s)));
  }));
  stringProps.set("replace", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const target = (args[1] as any).value;
      const replacement = (args[2] as any).value;
      return MK_STRING(str.replace(target, replacement));
  }));
  stringProps.set("replaceAll", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const target = (args[1] as any).value;
      const replacement = (args[2] as any).value;
      return MK_STRING(str.split(target).join(replacement));
  }));
  stringProps.set("upper", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.toUpperCase())));
  stringProps.set("lower", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.toLowerCase())));
  stringProps.set("trim", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.trim())));
  stringProps.set("includes", MK_NATIVE_FN((args) => MK_BOOL((args[0] as any).value.includes((args[1] as any).value))));
  stringProps.set("slice", MK_NATIVE_FN((args) => {
      const str = (args[0] as any).value;
      const start = (args[1] as any).value;
      const end = args[2] ? (args[2] as any).value : undefined;
      return MK_STRING(str.slice(start, end));
  }));
  stringProps.set("indexOf", MK_NATIVE_FN((args) => MK_NUMBER((args[0] as any).value.indexOf((args[1] as any).value))));
  stringProps.set("startsWith", MK_NATIVE_FN((args) => MK_BOOL((args[0] as any).value.startsWith((args[1] as any).value))));
  stringProps.set("endsWith", MK_NATIVE_FN((args) => MK_BOOL((args[0] as any).value.endsWith((args[1] as any).value))));
  stringProps.set("padStart", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.padStart((args[1] as any).value, args[2] ? (args[2] as any).value : " "))));
  stringProps.set("padEnd", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.padEnd((args[1] as any).value, args[2] ? (args[2] as any).value : " "))));
  stringProps.set("repeat", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.repeat((args[1] as any).value))));
  stringProps.set("charAt", MK_NATIVE_FN((args) => MK_STRING((args[0] as any).value.charAt((args[1] as any).value))));
  
  return MK_OBJECT(stringProps);
}
