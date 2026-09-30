import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider } from "./service-provider";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { ServiceProvider as TransactionServiceProvider } from "@mainsail/crypto-transaction";
import { ServiceProvider as AddressServiceProvider } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as KeyPairServiceProvider } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as HashBcryptoServiceProvider } from "@mainsail/crypto-hash-bcrypto";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Contracts.Crypto.Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const app = new Application();
		await app.resolve(ValidationServiceProvider).register();

		context.validator = app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		await app.resolve(CryptoValidationServiceProvider).register();
		await app.resolve(HashBcryptoServiceProvider).register();
		await app.resolve(KeyPairServiceProvider).register();
		await app.resolve(AddressServiceProvider).register();
		await app.resolve(TransactionServiceProvider).register();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Block.HeaderSize));
		assert.true(app.isBound(Identifiers.Cryptography.Block.Deserializer));
		assert.true(app.isBound(Identifiers.Cryptography.Block.Factory));
		assert.true(app.isBound(Identifiers.Cryptography.Block.HashFactory));
		assert.true(app.isBound(Identifiers.Cryptography.Block.Serializer));

		const headerSize = app.get<() => number>(Identifiers.Cryptography.Block.HeaderSize);
		assert.equal(headerSize(), 1 + 6 + 4 + 4 + 32 + 32 + 256 + 2 + 4 + 32 + 32 + 4 + 32 + 20 + 96);

		assert.true(validator.hasSchema("blockHeader"));
		assert.true(validator.hasSchema("block"));
		assert.true(validator.hasSchema("blockHash"));
		assert.true(validator.hasSchema("prefixedBlockHash"));
		assert.true(validator.hasSchema("blockHeader"));
		assert.true(validator.hasSchema("logsBloom"));
		assert.true(validator.hasSchema("stateRoot"));
		assert.true(validator.hasSchema("transactionsRoot"));
	});
});
