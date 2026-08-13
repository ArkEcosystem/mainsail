import type { Contracts } from "@mainsail/contracts";

import { Exception } from "./base.js";

export class NotEnoughRoundValidatorsError extends Exception {
	public constructor(actual: number, expected: number) {
		super(`Expected ${expected} round validators, but got ${actual}`);
	}
}

export class DoubleSignError extends Exception {
	public constructor(
		publicKey: string,
		last: Contracts.Validator.SigningPosition,
		next: Contracts.Validator.SigningPosition,
	) {
		super(
			`Refusing to sign ${next.blockNumber}/${next.round}/${next.step} (${next.value || "nil"}) for ${publicKey}, because ${last.blockNumber}/${last.round}/${last.step} (${last.value || "nil"}) was already signed and signing again would double-sign`,
		);
	}
}
