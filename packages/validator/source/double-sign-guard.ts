import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { DoubleSignError } from "@mainsail/exceptions";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeSync } from "fs";
import { dirname } from "path";

@injectable()
export class DoubleSignGuard implements Contracts.Validator.DoubleSignGuard {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#path!: string;

	#watermarks: Record<string, Contracts.Validator.SigningPosition> = {};

	@postConstruct()
	public initialize(): void {
		this.#path = this.app.dataPath("validator-state.json");

		if (existsSync(this.#path)) {
			this.#watermarks = JSON.parse(readFileSync(this.#path, "utf8"));
		}
	}

	public async guard(publicKey: string, position: Contracts.Validator.SigningPosition): Promise<void> {
		const last = this.#watermarks[publicKey];

		if (last !== undefined) {
			const order = this.#compare(position, last);

			if (order < 0) {
				throw new DoubleSignError(publicKey, last, position);
			}

			if (order === 0) {
				if (position.value !== last.value) {
					throw new DoubleSignError(publicKey, last, position);
				}

				return; // identical position and value: an idempotent re-sign, already durable.
			}
		}

		// Persist before updating memory, so the record is durable before the caller releases the
		// signature and a failed write never leaves memory ahead of disk.
		const next = { ...this.#watermarks, [publicKey]: position };
		this.#persist(next);
		this.#watermarks = next;
	}

	// Write-fsync-rename-fsync: the temporary file is flushed before it atomically replaces the
	// state file, and the directory is flushed so the replacement itself survives power loss.
	// A crash anywhere in between leaves the previous state intact.
	#persist(watermarks: Record<string, Contracts.Validator.SigningPosition>): void {
		const temporary = `${this.#path}.tmp`;

		const fd = openSync(temporary, "w");
		writeSync(fd, JSON.stringify(watermarks));
		fsyncSync(fd);
		closeSync(fd);

		renameSync(temporary, this.#path);

		const directory = openSync(dirname(this.#path), "r");
		fsyncSync(directory);
		closeSync(directory);
	}

	#compare(a: Contracts.Validator.SigningPosition, b: Contracts.Validator.SigningPosition): number {
		if (a.blockNumber !== b.blockNumber) {
			return a.blockNumber - b.blockNumber;
		}

		if (a.round !== b.round) {
			return a.round - b.round;
		}

		return a.step - b.step;
	}
}
