import { Container } from "@arkecosystem/container";
import {
	AddressFactory as Contract,
	BINDINGS,
	IConfiguration,
	IKeyPairFactory,
} from "@arkecosystem/core-crypto-contracts";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

@Container.injectable()
export class AddressFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		return encodeAddress(publicKey, this.configuration.get("network.address.ss58"));
	}

	public async validate(address: string): Promise<boolean> {
		try {
			encodeAddress(
				isHex(address)
					? hexToU8a(address)
					: decodeAddress(address, this.configuration.get("network.address.ss58")),
				this.configuration.get("network.address.ss58"),
			);

			return true;
		} catch {
			return false;
		}
	}
}
