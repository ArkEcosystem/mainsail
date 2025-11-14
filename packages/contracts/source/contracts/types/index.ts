export type { Class, JsonObject, JsonValue, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = any> = Record<string, T>;

export * from "./container.js";
