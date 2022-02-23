import { Container } from "@arkecosystem/core-container";
import { AddressFactory as Contract, BINDINGS, IKeyPairFactory } from "@arkecosystem/core-crypto-contracts";
import { ethers } from "ethers";

@Container.injectable()
export class AddressFactory implements Contract {
	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return ethers.utils.computeAddress(`0x${publicKey.toString("hex")}`);
	}

	public async validate(address: string): Promise<boolean> {
		return ethers.utils.isAddress(address);
	}
}
