/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { bech32 } from "@scure/base";

export class AddressFactory implements Contract {
	readonly #network: any;
	readonly #keyPairFactory: IKeyPairFactory;

	// @TODO: network type once final structure is known
	public constructor(network: any, keyPairFactory: IKeyPairFactory) {
		this.#network = network;
		this.#keyPairFactory = keyPairFactory;
	}

	public fromMnemonic(passphrase: string): string {
		return this.fromPublicKey(this.#keyPairFactory.fromMnemonic(passphrase).publicKey);
	}

	public fromPublicKey(publicKey: string): string {
		return bech32.encode(this.#network.prefix, bech32.toWords(Buffer.from(publicKey, "hex")));
	}

	public validate(address: string): boolean {
		try {
			bech32.decode(address);

			return true;
		} catch {
			return false;
		}
	}
}
