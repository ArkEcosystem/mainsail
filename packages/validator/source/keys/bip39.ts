import { Contracts } from "@mainsail/contracts";

export class BIP39 implements Contracts.Validator.ValidatorKeyPair {
	#keyPair!: Contracts.Crypto.KeyPair;

	public async configure(keyPair: Contracts.Crypto.KeyPair): Promise<this> {
		this.#keyPair = keyPair;
		return this;
	}

	get publicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async getKeyPair(): Promise<Contracts.Crypto.KeyPair> {
		return this.#keyPair;
	}
}
