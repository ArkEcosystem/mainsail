/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { bech32m } from "@scure/base";

export class AddressFactory implements Contract {
	readonly #network: any;
	readonly #keyPairFactory: IKeyPairFactory;

	// @TODO: network type once final structure is known
	public constructor(network: any, keyPairFactory: IKeyPairFactory) {
		this.#network = network;
		this.#keyPairFactory = keyPairFactory;
	}

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.#keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return bech32m.encode(this.#network.prefix, bech32m.toWords(publicKey));
	}

	public async validate(address: string): Promise<boolean> {
		try {
			bech32m.decode(address);

			return true;
		} catch {
			return false;
		}
	}
}
