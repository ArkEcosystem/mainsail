export interface Job {
	execute(callback: () => void | Promise<void>): void;
}
