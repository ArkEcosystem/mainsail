import { IPrivateKeyFactory } from "@arkecosystem/crypto-contracts";
import { KeyPairFactory } from "./pair";

export class PrivateKeyFactory implements IPrivateKeyFactory {
	readonly #keyPairFactory: KeyPairFactory;

	public constructor() {
		this.#keyPairFactory = new KeyPairFactory();
	}

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.#keyPairFactory.fromMnemonic(mnemonic)).privateKey;
	}

	public async fromWIF(wif: string, version: number): Promise<string> {
		return (await this.#keyPairFactory.fromWIF(wif, version)).privateKey;
	}
}
