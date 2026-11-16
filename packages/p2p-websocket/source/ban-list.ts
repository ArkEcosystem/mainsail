import { injectable } from "@mainsail/container";

import type { ConnectionVerifier } from "./interfaces/index.js";

import { CloseReason } from "./enums.js";

// Addresses that may not connect, each until a timestamp in milliseconds. Deciding whom to ban is
// the caller's job; this only stores the result and enforces it at accept time.
@injectable()
export class BanList implements ConnectionVerifier {
	readonly #bans = new Map<string, number>();

	public ban(ip: string, until: number): void {
		this.#sweep();
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
		this.#sweep();
		return [...this.#bans].map(([ip, until]) => ({ ip, until }));
	}

	public verify(ip: string): CloseReason | undefined {
		return this.isBanned(ip) ? CloseReason.Banned : undefined;
	}

	// Expired bans are otherwise only dropped when their own address is looked up again.
	#sweep(): void {
		const now = Date.now();
		for (const [ip, until] of this.#bans) {
			if (until <= now) {
				this.#bans.delete(ip);
			}
		}
	}
}
