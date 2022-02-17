/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

export class AddressFactory implements Contract {
	readonly #keyPairFactory: IKeyPairFactory;

	public constructor(_: any, keyPairFactory: IKeyPairFactory) {
		this.#keyPairFactory = keyPairFactory;
	}

	public fromMnemonic(mnemonic: string): string {
		return this.fromPublicKey(this.#keyPairFactory.fromMnemonic(mnemonic).publicKey);
	}

	public fromPublicKey(publicKey: string): string {
		return encodeAddress(hexToU8a(publicKey));
	}

	public validate(address: string): boolean {
		try {
			encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

			return true;
		} catch {
			return false;
		}
	}
}
