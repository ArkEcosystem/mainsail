export type { Class, JsonArray, JsonObject, JsonValue, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = unknown> = Record<string, T>;

export type Constructor<T = Record<string, unknown>> = new (...arguments_: unknown[]) => T;
