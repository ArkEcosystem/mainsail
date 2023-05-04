import { Exception } from "./base";

export class RelayCommunicationError extends Exception {
	public constructor(endpoint: string, message: string) {
		super(`Request to ${endpoint} failed, because of '${message}'.`);
	}
}

export class HostNoResponseError extends Exception {
	public constructor(host: string) {
		super(`${host} didn't respond. Trying again later.`);
	}
}
