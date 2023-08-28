export interface ILock {
	runExclusive<T>(callback: () => Promise<T>): Promise<T>;
	runNonExclusive<T>(callback: () => Promise<T>): Promise<T>;
}
