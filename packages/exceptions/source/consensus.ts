import { Exception } from "./base.js";

export class NotEnoughRoundValidatorsError extends Exception {
	public constructor(actual: number, expected: number) {
		super(`Expected ${expected} round validators, but got ${actual}`);
	}
}
