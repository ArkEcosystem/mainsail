interface IAttribute<T> {
	new (value: T): void;
	isChanged(): boolean;
	get(): T;
	set(value: T): void;
	clone(): IAttribute<T>;
}
