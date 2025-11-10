import { InvalidArgumentException } from "./logic.js";

export class ValidationFailed extends InvalidArgumentException {
	public constructor(error?: string) {
		super(`The given data was invalid: ${error}`);
	}
}
