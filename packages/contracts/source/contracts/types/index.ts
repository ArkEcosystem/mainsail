export type { Class, JsonObject, JsonValue, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = any> = Record<string, T>;

export type Constructor<T = Record<string, any>> = new (...arguments_: any[]) => T;
