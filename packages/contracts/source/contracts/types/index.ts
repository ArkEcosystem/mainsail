import type { CacheStore, Pipeline, Queue } from "../kernel/index.js";

export type { Class, JsonObject, JsonValue, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = any> = Record<string, T>;

export type ActionArguments = Record<string, any>;

export type CacheFactory<K, T> = <K, T>() => CacheStore<K, T>;

export type PipelineFactory = () => Pipeline;

export type QueueFactory = () => Queue;
