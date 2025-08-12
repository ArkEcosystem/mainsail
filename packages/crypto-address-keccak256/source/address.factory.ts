import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Keccak256, secp256k1 } from "bcrypto";
import { Address, checksumAddress, getAddress, Hex, isAddress, toBytes, toHex } from "viem";
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

		let publicKeyBytes = Buffer.from(publicKey, "hex");
		if (publicKeyBytes.length === 33) {
			publicKeyBytes = secp256k1.publicKeyConvert(publicKeyBytes, false);
		}

		if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
			throw new Error("Invalid uncompressed public key");
		}

		const unprefixed = publicKeyBytes.subarray(1); // drop 0x04
		const hash = Keccak256.digest(unprefixed);

		return checksumAddress(`0x${hash.slice(-20).toString("hex")}`);
	}
}
