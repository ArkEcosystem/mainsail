import type { ResponseMessage } from "../message.js";

import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { ConnectionError } from "../errors.js";

type Response = { statusCode: number; payload: Buffer };

type Pending = {
	resolve: (response: Response) => void;
	reject: (error: ConnectionError) => void;
	timer: NodeJS.Timeout;
};

// Outstanding requests we sent, keyed by id. Ids wrap at uint32 and never clash in practice: a
// request lives for at most REQUEST_TIMEOUT.
class RequestTable {
	readonly #pending = new Map<number, Pending>();

	#nextId = 1;

	public get size(): number {
		return this.#pending.size;
	}

	// Reserves an id and returns the promise its response will settle. The caller sends the frame.
	public open(): { id: number; response: Promise<Response> } {
		const id = this.#nextId;
		this.#nextId = this.#nextId >= 0xff_ff_ff_ff ? 1 : this.#nextId + 1;

		const response = new Promise<Response>((resolve, reject) => {
			// TODO: Handle node ban on repeated request timeouts.
			const timer = setTimeout(() => {
				this.#pending.delete(id);
				reject(new ConnectionError(CloseReason.RequestTimeout, `Request ${id} timed out`));
			}, constants.REQUEST_TIMEOUT);

			this.#pending.set(id, { reject, resolve, timer });
		});

		return { id, response };
	}

	// Returns false for an id we are not waiting on: a late or forged response is ignored by the caller.
	public onResponse(message: ResponseMessage): boolean {
		const pending = this.#pending.get(message.id);
		if (!pending) {
			return false;
		}

		this.#pending.delete(message.id);
		clearTimeout(pending.timer);
		pending.resolve({ payload: message.payload, statusCode: message.statusCode });

		return true;
	}

	// Fails everything still open, e.g. when the connection closes.
	public abort(error: ConnectionError): void {
		for (const [id, pending] of this.#pending) {
			this.#pending.delete(id);
			clearTimeout(pending.timer);
			pending.reject(error);
		}
	}
}

export { RequestTable, type Response };
