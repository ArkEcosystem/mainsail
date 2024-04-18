import { Contracts } from "@mainsail/contracts";
import { Keystore } from "@chainsafe/bls-keystore";
import { randomBytes } from "node:crypto";

export class BIP38 implements Contracts.Validator.ValidatorKeyPair {
	#keystore!: Keystore;

	#otp!: string;

	public async configure(keystore: Keystore, password: string): Promise<this> {
		this.#otp = password;
		this.#keystore = keystore;

		await this.#rotateKeystore();

		return this;
	}

	get publicKey(): string {
		return this.#keystore.pubkey;
	}

	public async getKeyPair(): Promise<Contracts.Crypto.KeyPair> {
		return this.#rotateKeystore();
	}

	async #rotateKeystore(): Promise<Contracts.Crypto.KeyPair> {
		const privateKey = await this.#keystore.decrypt(this.#otp);
		const otp = randomBytes(32).toString("hex");

		this.#keystore = await Keystore.create(
			otp,
			privateKey,
			Buffer.from(this.#keystore.pubkey, "hex"),
			this.#keystore.path,
		);

		this.#otp = otp;

		return {
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: this.#keystore.pubkey,
			compressed: false,
		};
	}
}
