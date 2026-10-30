import { injectable } from "@mainsail/container";

import type { ConnectionVerifier } from "./interfaces/index.js";

import { CloseReason } from "./enums.js";

// Addresses that may not connect, each until a timestamp in milliseconds. Deciding whom to ban is
// the caller's job; this only stores the result and enforces it at accept time.
@injectable()
export class BanList implements ConnectionVerifier {
	readonly #bans = new Map<string, number>();

	public ban(ip: string, until: number): void {
		this.#bans.set(ip, until);
	}

	public unban(ip: string): void {
		this.#bans.delete(ip);
	}

	public isBanned(ip: string): boolean {
		const until = this.#bans.get(ip);
		if (until === undefined) {
			return false;
		}

		if (until <= Date.now()) {
			this.#bans.delete(ip);
			return false;
		}

		return true;
	}

	public all(): { ip: string; until: number }[] {
		const now = Date.now();
		return [...this.#bans].filter(([, until]) => until > now).map(([ip, until]) => ({ ip, until }));
	}

	public verify(ip: string): CloseReason | undefined {
		return this.isBanned(ip) ? CloseReason.Banned : undefined;
	}
}
