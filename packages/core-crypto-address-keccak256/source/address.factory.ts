import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { ethers } from "ethers";

@injectable()
export class AddressFactory implements Crypto.IAddressFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return ethers.utils.computeAddress(`0x${publicKey}`);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Crypto.IMultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Crypto.IKeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return "";
	}

	public async toBuffer(address: string): Promise<{
		addressBuffer: Buffer;
		addressError?: string;
	}> {
		return { addressBuffer: Buffer.alloc(1) };
	}

	public async validate(address: string): Promise<boolean> {
		return ethers.utils.isAddress(address);
	}
}
