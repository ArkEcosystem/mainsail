import { Exception } from "./base";

export class WalletIndexAlreadyRegisteredError extends Exception {
	public constructor(what: string) {
		super(`The wallet index is already registered: ${what}`);
	}
}

export class WalletIndexNotFoundError extends Exception {
	public constructor(what: string) {
		super(`The wallet index does not exist: ${what}`);
	}
}
