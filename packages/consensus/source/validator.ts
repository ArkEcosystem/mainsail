import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Validator {
	#keyPair: Contracts.Crypto.IKeyPair;

	public configure(keyPair: Contracts.Crypto.IKeyPair): Validator {
		this.#keyPair = keyPair;

		return this;
	}

	public getPublicKey(): string {
		return this.#keyPair.publicKey;
	}
}
