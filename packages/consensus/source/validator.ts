import { Contracts } from "@mainsail/contracts";

export class Validator {
	#keyPair: Contracts.Crypto.IKeyPair;

	constructor(keyPair: Contracts.Crypto.IKeyPair) {
		this.#keyPair = keyPair;
	}

	public getPublicKey(): string {
		return this.#keyPair.publicKey;
	}
}
