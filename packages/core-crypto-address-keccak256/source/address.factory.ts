import { inject, injectable } from "@mainsail/core-container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { ethers } from "ethers";

@injectable()
export class AddressFactory implements Contracts.Crypto.IAddressFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return ethers.utils.computeAddress(`0x${publicKey}`);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.IMultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Contracts.Crypto.IKeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return "";
	}

	public async toBuffer(address: string): Promise<Buffer> {
		return Buffer.alloc(1);
	}

	public async validate(address: string): Promise<boolean> {
		return ethers.utils.isAddress(address);
	}
}
