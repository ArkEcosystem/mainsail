import type { Contracts } from "@mainsail/contracts";

export type KeyValuePair<T = any> = Record<string, T>;

export type ActionArguments = Record<string, any>;

export type CacheFactory<K, T> = <K, T>() => Promise<Contracts.Kernel.CacheStore<K, T>>;
