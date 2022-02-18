/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

export class AddressFactory implements Contract {
	readonly #keyPairFactory: IKeyPairFactory;

	public constructor(_: any, keyPairFactory: IKeyPairFactory) {
		this.#keyPairFactory = keyPairFactory;
	}

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.#keyPairFactory.fromMnemonic(mnemonic)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return encodeAddress(publicKey);
	}

	public async validate(address: string): Promise<boolean> {
		try {
			encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

			return true;
		} catch {
			return false;
		}
	}
}
