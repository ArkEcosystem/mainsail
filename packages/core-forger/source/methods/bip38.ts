import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import bip38 from "bip38";
import forge from "node-forge";
import wif from "wif";

import { Method } from "./method";

@injectable()
export class BIP38 extends Method implements Contracts.Forger.Validator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	@inject(Identifiers.Cryptography.Identity.WifFactory)
	private readonly wifFactory: Contracts.Crypto.IWIFFactory;

	public keys: Contracts.Crypto.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public otpSecret: string;

	public otp: string | undefined;

	public encryptedKeys: string | undefined;

	private readonly keySize: number = 32;

	private readonly iterations: number = 5000;

	public async configure(bip38: string, password: string): Promise<BIP38> {
		this.keys = await this.decryptPassphrase(bip38, password);
		this.publicKey = this.keys.publicKey;
		this.address = await this.addressFactory.fromPublicKey(this.keys.publicKey);
		this.otpSecret = forge.random.getBytesSync(128);

		await this.encryptKeysWithOtp();

		return this;
	}

	public async forge(
		transactions: Contracts.Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Contracts.Crypto.IBlock> {
		await this.decryptKeysWithOtp();

		AppUtils.assert.defined<Contracts.Crypto.IKeyPair>(this.keys);

		const block: Contracts.Crypto.IBlock = await this.createBlock(this.keys, transactions, options);

		await this.encryptKeysWithOtp();

		return block;
	}

	private async encryptKeysWithOtp(): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.IKeyPair>(this.keys);

		const wifKey: string = await this.wifFactory.fromKeys(this.keys);

		this.keys = undefined;
		this.otp = forge.random.getBytesSync(16);
		this.encryptedKeys = this.encryptDataWithOtp(wifKey, this.otp);
	}

	private async decryptKeysWithOtp(): Promise<void> {
		AppUtils.assert.defined<string>(this.encryptedKeys);
		AppUtils.assert.defined<string>(this.otp);

		const wifKey: string = this.decryptDataWithOtp(this.encryptedKeys, this.otp);

		this.keys = await this.keyPairFactory.fromWIF(wifKey);
		this.otp = undefined;
		this.encryptedKeys = undefined;
	}

	private async decryptPassphrase(passphrase: string, password: string): Promise<Contracts.Crypto.IKeyPair> {
		const decryptedWif: Contracts.Crypto.IDecryptResult = bip38.decrypt(passphrase, password);
		const wifKey: string = wif.encode(
			this.configuration.get("network.wif"),
			decryptedWif.privateKey,
			decryptedWif.compressed,
		);

		return this.keyPairFactory.fromWIF(wifKey);
	}

	private encryptDataWithOtp(content: string, password: string): string {
		AppUtils.assert.defined<string>(this.otpSecret);

		const cipher: forge.cipher.BlockCipher = forge.cipher.createCipher(
			"AES-CBC",
			forge.pkcs5.pbkdf2(password, this.otpSecret, this.iterations, this.keySize),
		);
		cipher.start({ iv: this.otp });
		cipher.update(forge.util.createBuffer(content));
		cipher.finish();

		return forge.util.encode64(cipher.output.getBytes());
	}

	private decryptDataWithOtp(cipherText: string, password: string): string {
		AppUtils.assert.defined<string>(this.otpSecret);

		const decipher: forge.cipher.BlockCipher = forge.cipher.createDecipher(
			"AES-CBC",
			forge.pkcs5.pbkdf2(password, this.otpSecret, this.iterations, this.keySize),
		);
		decipher.start({ iv: this.otp });
		decipher.update(forge.util.createBuffer(forge.util.decode64(cipherText)));
		decipher.finish();

		return decipher.output.toString();
	}
}
