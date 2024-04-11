import { Exception } from "./base.js";

export class NotEnoughActiveValidatorsError extends Exception {
	public constructor(actual: number, expected: number) {
		super(`Expected ${expected} active validators, but got ${actual}`);
	}
}
