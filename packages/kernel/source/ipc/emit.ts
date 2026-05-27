import { parentPort } from "worker_threads";

export const emit = (event: string, data: string): void => {
	parentPort?.postMessage({ data, event });
};
