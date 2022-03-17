import { Contracts } from "@arkecosystem/core-contracts";

export type { Class, JsonObject, PackageJson, Primitive } from "type-fest";

export type KeyValuePair<T = any> = Record<string, T>;

export type ActionArguments = Record<string, any>;

export type CacheFactory<K, T> = <K, T>() => Promise<Contracts.Kernel.CacheStore<K, T>>;

export type PipelineFactory = () => Contracts.Kernel.Pipeline;

export type QueueFactory = () => Promise<Contracts.Kernel.Queue>;
