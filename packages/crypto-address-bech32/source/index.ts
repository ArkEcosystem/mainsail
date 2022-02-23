import { Container } from "@arkecosystem/container";
import { AddressFactory as Contract, BINDINGS, IConfiguration, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { bech32 } from "@scure/base";

@Container.injectable()
export class AddressFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return bech32.encode(this.configuration.get("network.address.bech32"), bech32.toWords(publicKey));
	}

	public async validate(address: string): Promise<boolean> {
		try {
			bech32.decode(address);

			return true;
		} catch {
			return false;
		}
	}
}
