import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";

const mnemonic = "this is a top secret mnemonic";
const wif = "UfDzkBsi7xxjq491zm5tk7rCZ1EouBXsFUWaCvQWxAortbh1zq5T";

describe<{ app: Application; factory: AddressFactory }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		await context.app.resolve<ECDSA>(ECDSA).register();
		await context.app.resolve<CryptoHashBcrypto>(CryptoHashBcrypto).register();
		context.factory = context.app.resolve(AddressFactory);
	});

	it("#fromMnemonic - should derive an address from an mnemonic", async ({ factory }) => {
		assert.is(await factory.fromMnemonic(mnemonic), "DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa");
	});

	it("#fromPublicKey - should derive an address from a public key", async ({ factory }) => {
		assert.is(
			await factory.fromPublicKey("034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192"),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("#fromWIF - should derive an address from wif", async ({ factory }) => {
		assert.is(await factory.fromWIF(wif), "DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa");
	});

	it("#validate - should validate addresses", async ({ factory }) => {
		assert.true(await factory.validate("DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa"));
		assert.false(await factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
	});

	it("#toBuffer & #fromBuffer - should convert between buffer", async ({ factory }) => {
		assert.equal(
			await factory.fromBuffer(await factory.toBuffer("DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa")),
			"DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa",
		);
	});

	it("should throw if pubKeyHash doesn't match", async ({ factory, app }) => {
		app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).set("network.pubKeyHash", 44);

		await assert.rejects(
			() => factory.toBuffer("DLsMhiUzAVEXBXDTY1NGNZteWz8SDvphfa"),
			"Expected address network byte 44, but got 30.",
		);
	});

	it("#toBuffer - should throw invalid checksum", async ({ factory }) => {
		await assert.rejects(
			() => factory.toBuffer("E61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib"),
			"Invalid checksum for base58 string.",
		);
	});
});
