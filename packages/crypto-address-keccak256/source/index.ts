/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { ethers } from "ethers";

export class AddressFactory implements Contract {
	readonly #keyPairFactory: IKeyPairFactory;

	// @TODO: network type once final structure is known
	public constructor(_: any, keyPairFactory: IKeyPairFactory) {
		this.#keyPairFactory = keyPairFactory;
	}

	public fromMnemonic(passphrase: string): string {
		return this.fromPublicKey(this.#keyPairFactory.fromMnemonic(passphrase).publicKey);
	}

	public fromPublicKey(publicKey: string): string {
		return ethers.utils.computeAddress(`0x${publicKey}`);
	}

	public validate(address: string): boolean {
		return ethers.utils.isAddress(address);
	}
}
