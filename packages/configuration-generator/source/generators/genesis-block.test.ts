import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers as AppIdentifiers } from "@mainsail/constants";
import { buildProofOfPossession } from "@mainsail/crypto-key-pair-bls12-381";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { bytesToHex, encodeFunctionData } from "viem";

import { describe } from "@mainsail/test-runner";
import { makeApplication } from "../application-factory";
import { Wallet } from "../contracts";
import { Identifiers } from "../identifiers";
import { GenesisBlockGenerator } from "./genesis-block";
import { MnemonicGenerator } from "./mnemonic";
import { WalletGenerator } from "./wallet";

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
						evmSpec: Enums.Evm.SpecId.OSAKA,
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

	// Presigns the registration transaction for a wallet exactly as external validator tooling
	// would, so the generator itself never needs the validator secrets.
	const presignRegistration = async (app: Application, wallet: Wallet): Promise<string> => {
		const consensusContract = app.get<string>(AppIdentifiers.EvmConsensus.Contracts.Consensus);
		const { pop } = buildProofOfPossession(Buffer.from(wallet.consensusKeys.privateKey, "hex"));

		const registration = await (
			await app
				.resolve(TransactionBuilder)
				.network(123)
				.recipientAddress(consensusContract)
				.nonce("0")
				.payload(
					encodeFunctionData({
						abi: ConsensusAbi.abi,
						args: [`0x${wallet.consensusKeys.publicKey}`, bytesToHex(pop)],
						functionName: "registerValidator",
					}),
				)
				.value("0")
				.gasPrice(0)
				.gasLimit(500_000)
				.sign(wallet.passphrase)
		).build();

		return registration.serialized.toString("hex");
	};

	it("#generate - should build a genesis block from presigned validator registrations", async ({
		app,
		generator,
		mnemonicGenerator,
	}) => {
		const walletGenerator = app.get<WalletGenerator>(Identifiers.Generator.Wallet);
		const wallets = await Promise.all(
			mnemonicGenerator.generateMany(2).map(async (mnemonic) => await walletGenerator.generate(mnemonic)),
		);

		const validatorRegistrations = await Promise.all(
			wallets.map(async (wallet) => await presignRegistration(app, wallet)),
		);

		const data = await generator.generate(
			mnemonicGenerator.generate(),
			[],
			baseOptions({ validators: 2, validatorRegistrations }),
		);

		assert.object(data);

		// 2 premine transfers (one per recovered sender) + 2 registrations; no votes exist
		// at genesis in presigned mode.
		assert.length(data.block.transactions, 4);

		// The genesis wallet distributes the premine evenly to the presigned senders.
		assert.equal(data.block.transactions[0].to, wallets[0].address);
		assert.equal(data.block.transactions[1].to, wallets[1].address);
		assert.equal(data.block.transactions[0].value, BigInt(2_000_000_000 / 2));
		assert.equal(data.block.transactions[1].value, BigInt(2_000_000_000 / 2));
	});

	it("#generate - should reject a presigned validator registration that is not valid", async ({
		generator,
		mnemonicGenerator,
	}) => {
		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					[],
					baseOptions({ validators: 1, validatorRegistrations: ["deadbeef"] }),
				),
			"validatorRegistrations[0] is invalid",
		);
	});

	it("#generate - should reject a presigned transaction that is not a registerValidator call", async ({
		app,
		generator,
		mnemonicGenerator,
	}) => {
		const walletGenerator = app.get<WalletGenerator>(Identifiers.Generator.Wallet);
		const wallet = await walletGenerator.generate(mnemonicGenerator.generate());

		const vote = await (
			await app
				.resolve(TransactionBuilder)
				.network(123)
				.recipientAddress(app.get<string>(AppIdentifiers.EvmConsensus.Contracts.Consensus))
				.nonce("0")
				.payload(encodeFunctionData({ abi: ConsensusAbi.abi, args: [wallet.address], functionName: "vote" }))
				.gasPrice(0)
				.gasLimit(200_000)
				.sign(wallet.passphrase)
		).build();

		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					[],
					baseOptions({
						validators: 1,
						validatorRegistrations: [vote.serialized.toString("hex")],
					}),
				),
			"validatorRegistrations[0] is not a registerValidator call to the consensus contract.",
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
});
