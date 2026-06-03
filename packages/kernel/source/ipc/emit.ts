import { parentPort } from "worker_threads";

export const emit = (event: string, data: unknown): void => {
	parentPort?.postMessage({ data, event });
};
