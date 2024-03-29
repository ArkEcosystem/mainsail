import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ethers } from "ethers";

@injectable()
export class AddressFactory implements Contracts.Crypto.AddressFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return ethers.computeAddress(`0x${publicKey}`);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.MultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Contracts.Crypto.KeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return "";
	}

	public async toBuffer(address: string): Promise<Buffer> {
		return Buffer.alloc(1);
	}

	public async validate(address: string): Promise<boolean> {
		return ethers.isAddress(address);
	}
}
