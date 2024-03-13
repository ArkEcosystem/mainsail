import { InvalidArgumentException } from "./logic.js";

export class ValidationFailed extends InvalidArgumentException {
	public constructor() {
		super("The given data was invalid.");
	}
}
