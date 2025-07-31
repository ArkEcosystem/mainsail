import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { getAddress, toBytes, toHex, isAddress, keccak256, Address, checksumAddress, Hex } from "viem";
import { ProjectivePoint } from "@noble/secp256k1";
import { privateKeyToAccount } from "viem/accounts";

@injectable()
export class AddressFactory implements Contracts.Crypto.AddressFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Factory)
	@tagged("type", "wallet")
	private readonly publicKeyFactory!: Contracts.Crypto.PublicKeyFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return this.#computeAddress(publicKey);
	}

	public async fromWIF(wif: string): Promise<string> {
		return this.fromPublicKey(await this.publicKeyFactory.fromWIF(wif));
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.MultiSignatureAsset): Promise<string> {
		return this.fromPublicKey(await this.publicKeyFactory.fromMultiSignatureAsset(asset));
	}

	public async fromPrivateKey(privateKey: Contracts.Crypto.KeyPair): Promise<string> {
		return this.fromPublicKey(privateKey.publicKey);
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return getAddress(toHex(buffer));
	}

	public async toBuffer(address: string): Promise<Buffer> {
		return Buffer.from(toBytes(address));
	}

	public async validate(address: string): Promise<boolean> {
		return isAddress(address);
	}

	// Convert compressed and uncompressed public keys to Ethereum address
	// https://github.com/wevm/viem/discussions/2044
	#computeAddress(publicKey: string): Address {
		// Schnorr public keys are treated as private keys (replicated ethers.js behavior)
		if (publicKey.length === 64) {
			return privateKeyToAccount((publicKey.startsWith("0x") ? publicKey : `0x${publicKey}`) as Hex).address;
		}

		const point = ProjectivePoint.fromHex(publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey);
		const raw = point.toRawBytes(false).slice(1); // strip 0x04 prefix
		const hash = keccak256(toHex(raw));

		return checksumAddress(`0x${hash.slice(-40)}`);
	}
}
