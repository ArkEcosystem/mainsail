import { parentPort } from "worker_threads";

export const emit = (event: string, data: any): void => {
	parentPort?.postMessage({ data, event });
};
