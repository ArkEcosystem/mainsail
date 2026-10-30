import { injectable } from "@mainsail/container";

import type { Connection } from "./connection.js";
import type { ConnectionVerifier } from "./interfaces.js";

import { CloseReason } from "./enums.js";

// Live connections keyed by remote address, one per address. Register a connection as soon as
// it is accepted or dialed (before its handshake) so a second socket from the same address is
// refused while the first one is still being set up.
@injectable()
export class ConnectionRepository implements ConnectionVerifier {
	readonly #connections = new Map<string, Connection>();

	public add(connection: Connection): void {
		this.#connections.set(connection.remoteAddress, connection);
	}

	public remove(connection: Connection): void {
		if (this.#connections.get(connection.remoteAddress) === connection) {
			this.#connections.delete(connection.remoteAddress);
		}
	}

	public has(ip: string): boolean {
		return this.#connections.has(ip);
	}

	public get(ip: string): Connection | undefined {
		return this.#connections.get(ip);
	}

	public all(): Connection[] {
		return [...this.#connections.values()];
	}

	public get size(): number {
		return this.#connections.size;
	}

	// First connection to an address wins; see the crossed-dial note in the package docs.
	public verify(ip: string): CloseReason | undefined {
		return this.has(ip) ? CloseReason.DuplicatePeer : undefined;
	}
}
