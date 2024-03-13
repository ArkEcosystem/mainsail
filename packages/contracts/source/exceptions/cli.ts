import { Exception } from "./base.js";

export class InvalidPackageJson extends Exception {
	public constructor() {
		super(`Missing or invalid package.json in extracted package.`);
	}
}

export class MissingPackageFolder extends Exception {
	public constructor() {
		super(`Compressed file doesn't contain required package folder`);
	}
}
