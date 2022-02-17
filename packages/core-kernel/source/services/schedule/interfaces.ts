export interface Job {
	execute(callback: () => void): void;
}
