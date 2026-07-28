import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers as AppIdentifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { makeApplication } from "../application-factory";
import { Identifiers } from "../identifiers";
import { GenesisBlockGenerator } from "./genesis-block";
import { MnemonicGenerator } from "./mnemonic";

describe<{
	app: Application;
	generator: GenesisBlockGenerator;
	mnemonicGenerator: MnemonicGenerator;
}>("GenesisBlockGenerator", ({ it, assert, stub, afterEach, beforeEach }) => {
	const baseOptions = (overrides: Record<string, unknown> = {}) =>
		({
			chainId: 123,
			epoch: new Date(),
			initialBlockNumber: 0,
			premine: "2000000000",
			validators: 2,
			validatorRegistrationFee: "0",
			...overrides,
		}) as Contracts.NetworkGenerator.InternalOptions;

	afterEach(async (context) => {
		for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
			await context.app.getTagged<Contracts.Evm.Instance>(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	});

	beforeEach(async (context) => {
		const app = await makeApplication();

		context.app = app;

		app.get<Contracts.Crypto.Configuration>(AppIdentifiers.Cryptography.Configuration).setConfig(
			{
				genesisBlock: {
					block: {
						number: 0,
						timestamp: 0,
					},
				},
				milestones: [
					{
						block: { maxGasLimit: 30_000_000, maxPayload: 2_097_152, version: 1 },
						evmSpec: Enums.Evm.SpecId.PRAGUE,
						// @ts-ignore
						gas: {
							maximumGasLimit: 2_000_000,
							maximumGasPrice: 10_000 * 1e9,
							minimumGasLimit: 21_000,
							minimumGasPrice: 5 * 1e9,
						},

						height: 0,
						reward: "0",
					},
					{
						height: 1,
						validatorRegistrationFee: "250",
					},
				],
				network: {
					chainId: 123,
				},
			},
			false,
		);

		context.generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);
		context.mnemonicGenerator = app.get<MnemonicGenerator>(Identifiers.Generator.Mnemonic);
	});

	it("#generate - should return generated data", async ({ generator, mnemonicGenerator }) => {
		const validatorsCount = 53;
		assert.object(
			await generator.generate(
				mnemonicGenerator.generate(),
				mnemonicGenerator.generateMany(validatorsCount),
				baseOptions({ validators: 53 }),
			),
		);
	});

	it("#generate - should import legacy cold wallets when requested", async ({ generator, mnemonicGenerator }) => {
		assert.object(
			await generator.generate(
				mnemonicGenerator.generate(),
				mnemonicGenerator.generateMany(3),
				baseOptions({ createLegacyColdWallets: true, validators: 3 }),
			),
		);
	});

	it("#generate - should build a genesis block from a legacy snapshot", async ({ app, mnemonicGenerator }) => {
		const importer = {
			genesisBlockNumber: 0n,
			import: async () => ({
				importedUsernames: 0,
				importedValidators: 0,
				importedVoters: 0,
				initialTotalSupply: 0n,
			}),
			previousGenesisBlockHash: "0".repeat(64),
			snapshotHash: "0".repeat(64),
		};
		app.rebind(AppIdentifiers.Snapshot.Legacy.Importer).toConstantValue(importer as any);

		// The snapshot is loaded by a stubbed importer (no real validators reach the EVM), so stub the
		// post-deploy EVM steps the genesis block builder runs after the snapshot import. The Deployer
		// (run during #prepareEvm) does not use these methods, so its real execution is unaffected.
		const evm = app.getTagged<Contracts.Evm.Instance>(AppIdentifiers.Evm.Instance, "instance", "evm");
		stub(evm, "updateRewardsAndVotes").callsFake(async () => {});
		stub(evm, "calculateRoundValidators").callsFake(async () => {});
		stub(evm, "logsBloom").callsFake(async () => "0".repeat(512));
		stub(evm, "stateRoot").callsFake(async () => "0".repeat(64));

		const generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);

		assert.object(
			await generator.generate(
				mnemonicGenerator.generate(),
				mnemonicGenerator.generateMany(2),
				baseOptions({ snapshot: { path: "/snapshot" }, premine: "0" }),
			),
		);
	});

	it("#generate - should throw when a genesis transaction reverts", async ({ app, generator, mnemonicGenerator }) => {
		const evm = app.getTagged<Contracts.Evm.Instance>(AppIdentifiers.Evm.Instance, "instance", "evm");
		const realProcess = evm.process.bind(evm);
		// Deployer's contract deployments carry value 0 and run for real; the value-bearing genesis
		// transactions (transfers / registration) are forced to revert.
		stub(evm, "process").callsFake(async (context: any) =>
			context.value > 0n ? { receipt: { gasUsed: 0n, logs: [], status: 0 } } : realProcess(context),
		);

		await assert.rejects(
			() => generator.generate(mnemonicGenerator.generate(), mnemonicGenerator.generateMany(2), baseOptions()),
			"reverted during EVM execution",
		);
	});

	it("#generate - should throw when a transaction fails hash verification", async ({
		app,
		generator,
		mnemonicGenerator,
	}) => {
		stub(
			app.get<Contracts.Crypto.TransactionVerifier>(AppIdentifiers.Cryptography.Transaction.Verifier),
			"verifyHash",
		).callsFake(async () => false);

		await assert.rejects(
			() => generator.generate(mnemonicGenerator.generate(), mnemonicGenerator.generateMany(2), baseOptions()),
			"genesis block contains invalid transactions",
		);
	});
});
