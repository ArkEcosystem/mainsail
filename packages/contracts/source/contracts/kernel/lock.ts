export interface Lock {
	runExclusive<T>(callback: () => Promise<T>): Promise<T>;
	runNonExclusive<T>(callback: () => Promise<T>): Promise<T>;
}
