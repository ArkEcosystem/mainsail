/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { ethers } from "ethers";

export class AddressFactory implements Contract {
	readonly #keyPairFactory: IKeyPairFactory;

	// @TODO: network type once final structure is known
	public constructor(_: any, keyPairFactory: IKeyPairFactory) {
		this.#keyPairFactory = keyPairFactory;
	}

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.#keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return ethers.utils.computeAddress(`0x${publicKey.toString("hex")}`);
	}

	public async validate(address: string): Promise<boolean> {
		return ethers.utils.isAddress(address);
	}
}
