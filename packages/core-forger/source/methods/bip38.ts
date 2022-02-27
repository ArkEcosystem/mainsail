import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import Interfaces, {
	BINDINGS,
	IAddressFactory,
	IConfiguration,
	IKeyPairFactory,
	IWIFFactory,
} from "@arkecosystem/core-crypto-contracts";
import forge from "node-forge";
import wif from "wif";
import bip38 from "bip38";
import { Container } from "@arkecosystem/core-kernel";

import { Delegate } from "../interfaces";
import { Method } from "./method";

@Container.injectable()
export class BIP38 extends Method implements Delegate {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly addressFactory: IAddressFactory;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly keyPairFactory: IKeyPairFactory;

	@Container.inject(BINDINGS.Identity.WifFactory)
	private readonly wifFactory: IWIFFactory;

	public keys: Interfaces.IKeyPair | undefined;

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

		this.encryptKeysWithOtp();

		return this;
	}

	public async forge(
		transactions: Interfaces.ITransactionData[],
		options: Record<string, any>,
	): Promise<Interfaces.IBlock> {
		this.decryptKeysWithOtp();

		AppUtils.assert.defined<Interfaces.IKeyPair>(this.keys);

		const block: Interfaces.IBlock = await this.createBlock(this.keys, transactions, options);

		this.encryptKeysWithOtp();

		return block;
	}

	private async encryptKeysWithOtp(): Promise<void> {
		AppUtils.assert.defined<Interfaces.IKeyPair>(this.keys);

		const wifKey: string = await this.wifFactory.fromKeys(this.keys, this.configuration.get("network.wif"));

		this.keys = undefined;
		this.otp = forge.random.getBytesSync(16);
		this.encryptedKeys = this.encryptDataWithOtp(wifKey, this.otp);
	}

	private async decryptKeysWithOtp(): Promise<void> {
		AppUtils.assert.defined<string>(this.encryptedKeys);
		AppUtils.assert.defined<string>(this.otp);

		const wifKey: string = this.decryptDataWithOtp(this.encryptedKeys, this.otp);

		this.keys = await this.keyPairFactory.fromWIF(wifKey, this.configuration.get("network.wif"));
		this.otp = undefined;
		this.encryptedKeys = undefined;
	}

	private async decryptPassphrase(passphrase: string, password: string): Promise<Interfaces.IKeyPair> {
		const decryptedWif: Interfaces.IDecryptResult = bip38.decrypt(passphrase, password);
		const wifKey: string = wif.encode(
			this.configuration.get("network.wif"),
			decryptedWif.privateKey,
			decryptedWif.compressed,
		);

		return this.keyPairFactory.fromWIF(wifKey, this.configuration.get("network.wif"));
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
