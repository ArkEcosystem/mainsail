export interface CacheStore<K, T> {
	make(): Promise<CacheStore<K, T>>;

	all(): Promise<Array<[K, T]>>;

	keys(): Promise<K[]>;

	values(): Promise<T[]>;

	get(key: K): Promise<T | undefined>;

	getMany(keys: K[]): Promise<Array<T | undefined>>;

	put(key: K, value: T, seconds: number): Promise<boolean>;

	putMany(values: Array<[K, T]>, seconds: number): Promise<boolean[]>;

	has(key: K): Promise<boolean>;

	hasMany(keys: K[]): Promise<boolean[]>;

	missing(key: K): Promise<boolean>;

	missingMany(keys: K[]): Promise<boolean[]>;

	forever(key: K, value: T): Promise<boolean>;

	foreverMany(values: Array<[K, T]>, value: T): Promise<boolean[]>;

	forget(key: K): Promise<boolean>;

	forgetMany(keys: K[]): Promise<boolean[]>;

	flush(): Promise<boolean>;

	getPrefix(): Promise<string>;
}
