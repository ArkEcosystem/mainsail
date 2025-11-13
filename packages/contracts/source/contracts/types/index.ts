import type { CacheStore } from "../kernel/cache.js";

export type { Class, JsonObject, JsonValue, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = any> = Record<string, T>;

export type ActionArguments = Record<string, any>;

export type CacheFactory<K, T> = <K, T>() => CacheStore<K, T>;
