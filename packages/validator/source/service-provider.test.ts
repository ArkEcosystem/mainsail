import type { Contracts } from "@mainsail/contracts";

import { Keystore } from "@chainsafe/bls-keystore";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { validatorKeys } from "../test/fixtures/validator-keys";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	keyPairFactory: Contracts.Crypto.KeyPairFactory;
	keyPair: Contracts.Crypto.KeyPair;
	repository: { configure: (validators: Contracts.Validator.Validator[]) => unknown };
}>("ServiceProvider", ({ it, assert, beforeEach, spy }) => {
	const { mnemonic } = validatorKeys[0];
	const hexPrivateKey = validatorKeys[0].consensusKeyPair.privateKey;

	beforeEach((context) => {
		context.app = new Application();

		context.keyPair = validatorKeys[0].consensusKeyPair;
		context.keyPairFactory = {
			fromMnemonic: async () => context.keyPair,
			fromPrivateKey: async () => context.keyPair,
			fromWIF: async () => context.keyPair,
		};
		context.app
			.bind(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.toConstantValue(context.keyPairFactory)
			.whenTagged("type", "consensus");

		// Dependencies required only so a Validator instance can be resolved; never invoked here.
		context.app.bind(Identifiers.Cryptography.Proposal.Serializer).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.Validator.DoubleSignGuard).toConstantValue({ guard: () => {} });
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({});

		// A stub repository so boot's `configure(validators)` call is observable.
		context.repository = { configure: () => {} };
		context.app.bind(Identifiers.Validator.Repository).toConstantValue(context.repository);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the validator repository", async () => {
		// Use a fresh app so register binds against the real (unstubbed) identifier.
		const freshApp = new Application();
		const serviceProvider = freshApp.resolve(ServiceProvider);

		await serviceProvider.register();

		assert.true(freshApp.isBound(Identifiers.Validator.Repository));
	});

	it("#boot - should load a validator from a mnemonic secret", async ({
		app,
		serviceProvider,
		keyPairFactory,
		repository,
		keyPair,
	}) => {
		app.config("validators", { secrets: [mnemonic] });

		const fromMnemonic = spy(keyPairFactory, "fromMnemonic");
		const configure = spy(repository, "configure");

		await serviceProvider.boot();

		fromMnemonic.calledOnce();
		fromMnemonic.calledWith(mnemonic);

		configure.calledOnce();
		const [validators] = configure.getCallArgs(0);
		assert.length(validators, 1);
		assert.equal(validators[0].getConsensusPublicKey(), keyPair.publicKey);
	});

	it("#boot - should load a validator from a hex private key secret", async ({
		app,
		serviceProvider,
		keyPairFactory,
		repository,
	}) => {
		app.config("validators", { secrets: [hexPrivateKey] });

		const fromPrivateKey = spy(keyPairFactory, "fromPrivateKey");
		const configure = spy(repository, "configure");

		await serviceProvider.boot();

		fromPrivateKey.calledOnce();
		fromPrivateKey.calledWith(Buffer.from(hexPrivateKey, "hex"));

		configure.calledOnce();
		assert.length(configure.getCallArgs(0)[0], 1);
	});

	it("#boot - should load every configured secret", async ({ app, serviceProvider, repository }) => {
		app.config("validators", { secrets: [mnemonic, hexPrivateKey] });

		const configure = spy(repository, "configure");

		await serviceProvider.boot();

		assert.length(configure.getCallArgs(0)[0], 2);
	});

	it("#boot - should throw for a secret that is neither a mnemonic nor a private key", async ({
		app,
		serviceProvider,
	}) => {
		app.config("validators", { secrets: ["not-a-valid-secret"] });

		await assert.rejects(() => serviceProvider.boot(), "invalid validator secret");
	});

	it("#boot - should throw when the validators config is missing", async ({ serviceProvider }) => {
		await assert.rejects(() => serviceProvider.boot());
	});

	it("#boot - should load a validator from a keystore and wipe the password afterwards", async ({
		app,
		serviceProvider,
		repository,
	}) => {
		const password = "keystore-password";
		const keystore = await Keystore.create(
			password,
			Buffer.from(hexPrivateKey, "hex"),
			Buffer.from(validatorKeys[0].consensusKeyPair.publicKey, "hex"),
			"m/12381/3600/0/0/0",
		);

		app.config("validators", { keystore: keystore.stringify(), secrets: [] });

		const pluginConfiguration = { getRequired: () => password, unset: () => {} };
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(pluginConfiguration)
			.whenTagged("plugin", "validator");

		const unset = spy(pluginConfiguration, "unset");
		const configure = spy(repository, "configure");

		await serviceProvider.boot();

		const [validators] = configure.getCallArgs(0);
		assert.length(validators, 1);
		assert.equal(validators[0].getConsensusPublicKey(), validatorKeys[0].consensusKeyPair.publicKey);

		unset.calledWith("validatorKeystorePassword");
	});
});
