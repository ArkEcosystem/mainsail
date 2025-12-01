import { parentPort } from "worker_threads";

export const emit = <T>(event: string, data: T): void => {
	parentPort?.postMessage({ data, event });
};
