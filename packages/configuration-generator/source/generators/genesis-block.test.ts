import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers as AppIdentifiers } from "@mainsail/constants";
import { buildProofOfPossession } from "@mainsail/crypto-key-pair-bls12-381";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { ConsensusAbi, FunctionSigs } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
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
}>("GenesisBlockGenerator", ({ it, assert, stub, spy, afterEach, beforeEach }) => {
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
						roundValidators: 0,
					},
					{
						height: 1,
						roundValidators: 1,
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
			validators: [],
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

	// Mimics what the real importer does for a legacy delegate: `addValidator` registers the address
	// with the consensus contract without a BLS key, exactly like a dormant snapshot validator.
	const makeSnapshotImporter = (app: Application, validators: { address: string; isResigned: boolean }[]) => {
		const evm = app.getTagged<Contracts.Evm.Instance>(AppIdentifiers.Evm.Instance, "instance", "evm");
		const deployerAddress = app.get<string>(AppIdentifiers.EvmConsensus.DeployerAddress);
		const consensusContract = app.get<string>(AppIdentifiers.EvmConsensus.Contracts.Consensus);

		return {
			genesisBlockNumber: 0n,
			import: async ({ commitKey, timestamp }: Contracts.Snapshot.LegacyImportOptions) => {
				await evm.prepareNextCommit({
					blockContext: {
						commitKey,
						gasLimit: 30_000_000n,
						prevrandao: Buffer.alloc(32),
						timestamp: BigInt(timestamp),
						validatorAddress: deployerAddress,
					},
				});

				let { nonce } = await evm.getAccountInfo(deployerAddress);

				for (const [index, { address, isResigned }] of validators.entries()) {
					const { receipt } = await evm.process({
						commitKey,
						data: Buffer.from(
							encodeFunctionData({
								abi: ConsensusAbi.abi,
								args: [address, isResigned],
								functionName: "addValidator",
							}).slice(2),
							"hex",
						),
						from: deployerAddress,
						gasLimit: 1_000_000n,
						gasPrice: 0n,
						nonce: nonce++,
						specId: Enums.Evm.SpecId.OSAKA,
						to: consensusContract,
						txHash: index.toString(16).padStart(64, "0"),
						value: 0n,
					});

					assert.equal(receipt.status, 1);
				}

				return {
					importedUsernames: 0,
					importedValidators: validators.length,
					importedVoters: 0,
					initialTotalSupply: 0n,
				};
			},
			previousGenesisBlockHash: "0".repeat(64),
			snapshotHash: "0".repeat(64),
			validators: validators.map(({ address, isResigned }, index) => ({
				arkAddress: "",
				ethAddress: address,
				isResigned,
				publicKey: "",
				username: `validator_${index}`,
			})),
		};
	};

	it("#generate - should update validators that already exist in the snapshot instead of registering them", async ({
		app,
		mnemonicGenerator,
	}) => {
		const walletGenerator = app.get<WalletGenerator>(Identifiers.Generator.Wallet);
		const mnemonics = mnemonicGenerator.generateMany(2);
		const [existing, fresh] = await Promise.all(
			mnemonics.map(async (mnemonic) => await walletGenerator.generate(mnemonic)),
		);

		app.rebind(AppIdentifiers.Snapshot.Legacy.Importer).toConstantValue(
			makeSnapshotImporter(app, [{ address: existing.address, isResigned: false }]) as any,
		);

		const generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);

		const data = await generator.generate(
			mnemonicGenerator.generate(),
			mnemonics,
			baseOptions({ premine: "0", snapshot: { path: "/snapshot" }, validators: 2 }),
		);

		// 1 registration (fresh) + 1 update (existing) + 1 self-vote (fresh only); the existing
		// validator keeps the votes imported from the snapshot, so no vote is emitted for it.
		assert.length(data.block.transactions, 3);

		const [registration, update, vote] = data.block.transactions;

		assert.equal(registration.from, fresh.address);
		assert.true(registration.data.startsWith(FunctionSigs.ConsensusV1.RegisterValidator));

		assert.equal(update.from, existing.address);
		assert.true(update.data.startsWith(FunctionSigs.ConsensusV1.UpdateValidator));

		assert.equal(vote.from, fresh.address);
		assert.true(vote.data.startsWith(FunctionSigs.ConsensusV1.Vote));
	});

	it("#generate - should reject a validator that is resigned in the snapshot", async ({ app, mnemonicGenerator }) => {
		const walletGenerator = app.get<WalletGenerator>(Identifiers.Generator.Wallet);
		const mnemonics = mnemonicGenerator.generateMany(1);
		const [resigned] = await Promise.all(
			mnemonics.map(async (mnemonic) => await walletGenerator.generate(mnemonic)),
		);

		app.rebind(AppIdentifiers.Snapshot.Legacy.Importer).toConstantValue(
			makeSnapshotImporter(app, [{ address: resigned.address, isResigned: true }]) as any,
		);

		const generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);

		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					mnemonics,
					baseOptions({ premine: "0", snapshot: { path: "/snapshot" }, validators: 1 }),
				),
			`validator ${resigned.address} (validator_0) is resigned in the snapshot and cannot become active`,
		);
	});

	// Presigns the registration transaction for a wallet exactly as external validator tooling
	// would, so the generator itself never needs the validator secrets.
	const presignRegistration = async (app: Application, wallet: Wallet, popChainId = 123): Promise<string> => {
		const consensusContract = app.get<string>(AppIdentifiers.EvmConsensus.Contracts.Consensus);
		const { pop } = buildProofOfPossession(Buffer.from(wallet.consensusKeys.privateKey, "hex"), {
			chainId: popChainId,
			registrantAddress: wallet.address,
		});

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

	const importDelegate = (app: Application, ethAddress: string) => {
		const importer = {
			genesisBlockNumber: 0n,
			import: async () => {},
			previousGenesisBlockHash: "0".repeat(64),
			snapshotHash: "0".repeat(64),
			validators: [{ ethAddress, isResigned: false, username: "dormant_delegate" }],
		};
		app.rebind(AppIdentifiers.Snapshot.Legacy.Importer).toConstantValue(importer as any);

		return importer;
	};

	it("#generate - should reject a genesis validator that is an imported delegate", async ({
		app,
		mnemonicGenerator,
	}) => {
		const mnemonics = mnemonicGenerator.generateMany(2);
		const wallet = await app.get<WalletGenerator>(Identifiers.Generator.Wallet).generate(mnemonics[1]);
		const importer = importDelegate(app, wallet.address.toLowerCase());
		const importSpy = spy(importer, "import");
		const generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);

		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					mnemonics,
					baseOptions({ premine: "0", snapshot: { path: "/snapshot" } }),
				),
			`genesis validator ${wallet.address} is the imported V3 delegate dormant_delegate`,
		);
		importSpy.neverCalled();
	});

	it("#generate - should reject a presigned genesis validator that is an imported delegate", async ({
		app,
		mnemonicGenerator,
	}) => {
		const wallet = await app
			.get<WalletGenerator>(Identifiers.Generator.Wallet)
			.generate(mnemonicGenerator.generate());
		const validatorRegistrations = [await presignRegistration(app, wallet)];
		const importer = importDelegate(app, wallet.address);
		const importSpy = spy(importer, "import");
		const generator = app.get<GenesisBlockGenerator>(Identifiers.Generator.GenesisBlock);

		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					[],
					baseOptions({
						premine: "0",
						snapshot: { path: "/snapshot" },
						validatorRegistrations,
						validators: 1,
					}),
				),
			`genesis validator ${wallet.address} is the imported V3 delegate dormant_delegate`,
		);
		importSpy.neverCalled();
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

	it("#generate - should name the reason when a genesis transaction reverts", async ({
		app,
		generator,
		mnemonicGenerator,
	}) => {
		const wallet = await app
			.get<WalletGenerator>(Identifiers.Generator.Wallet)
			.generate(mnemonicGenerator.generate());
		const registration = await presignRegistration(app, wallet, 11_812);

		await assert.rejects(
			() =>
				generator.generate(
					mnemonicGenerator.generate(),
					[],
					baseOptions({ validators: 1, validatorRegistrations: [registration] }),
				),
			"reverted during EVM execution: InvalidProofOfPossession (gas used ",
			" of 500000)",
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

	it("#generate - should pin the genesis of a legacy snapshot", async ({ app, generator }) => {
		app.get<Contracts.Crypto.Configuration>(AppIdentifiers.Cryptography.Configuration).setConfig(
			{
				// @ts-ignore
				genesisBlock: { block: { number: 4001, timestamp: 0 } },
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
						height: 4001,
						reward: "0",
						roundValidators: 0,
					},
					{ height: 4002, roundValidators: 2, validatorRegistrationFee: "0" },
				],
				// @ts-ignore
				network: { chainId: 123, pubKeyHash: 30 },
			},
			false,
		);

		const hotWallet = async (mnemonic: string, fields: Record<string, unknown> = {}) => {
			const { publicKey } = await app
				.getTagged<Contracts.Crypto.KeyPairFactory>(
					AppIdentifiers.Cryptography.Identity.KeyPair.Factory,
					"type",
					"wallet",
				)
				.fromMnemonic(mnemonic);

			return {
				arkAddress: await app
					.get<Contracts.Crypto.AddressFactory>(AppIdentifiers.Cryptography.Legacy.Identity.AddressFactory)
					.fromPublicKey(publicKey),
				balance: "100000000",
				ethAddress: await app
					.getTagged<Contracts.Crypto.AddressFactory>(
						AppIdentifiers.Cryptography.Identity.Address.Factory,
						"type",
						"wallet",
					)
					.fromPublicKey(publicKey),
				legacyNonce: "1",
				publicKey,
				...fields,
			};
		};

		const resignedDelegate = await hotWallet("resigned delegate", {
			attributes: { delegate: { resigned: true, username: "resigned_delegate" } },
			balance: "2500000000000",
		});
		const activeDelegate = await hotWallet("active delegate", {
			attributes: { delegate: { username: "active_delegate" } },
			balance: "1500000000000",
		});
		const secondKeyVoter = await hotWallet("second key voter", {
			attributes: { secondPublicKey: resignedDelegate.publicKey, vote: activeDelegate.publicKey },
		});
		const voter = await hotWallet("voter", { attributes: { vote: resignedDelegate.publicKey } });
		const multiSignatureWallet = await hotWallet("multisignature wallet", {
			attributes: { multiSignature: { min: 1, publicKeys: [voter.publicKey, secondKeyVoter.publicKey] } },
		});
		const genesisWallet = await hotWallet("genesis wallet", { balance: "-5600200000000" });
		const { arkAddress } = await hotWallet("cold wallet");

		const chainTip = { hash: createHash("sha256").update("legacy chain tip").digest("hex"), number: "4000" };
		const wallets = [
			genesisWallet,
			resignedDelegate,
			activeDelegate,
			secondKeyVoter,
			voter,
			multiSignatureWallet,
			{ arkAddress, balance: "700000000", legacyNonce: "0" },
		];
		const hash = createHash("sha256").update(JSON.stringify(chainTip));
		for (const wallet of wallets) {
			hash.update(JSON.stringify(wallet));
		}
		const snapshot = { chainTip, hash: hash.digest("hex"), wallets };

		const directory = mkdtempSync(join(tmpdir(), "legacy-snapshot-"));
		const path = join(directory, `${snapshot.hash}.compressed`);
		writeFileSync(path, brotliCompressSync(JSON.stringify(snapshot)));
		await app.get<Contracts.Snapshot.LegacyImporter>(AppIdentifiers.Snapshot.Legacy.Importer).prepare(path);
		rmSync(directory, { recursive: true });

		const { block } = await generator.generate(
			"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
			[
				"legal winner thank year wave sausage worth useful legal winner thank yellow",
				"letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
			],
			baseOptions({
				epoch: new Date(0),
				initialBlockNumber: 4001,
				premine: "0",
				snapshot: { path },
				validators: 2,
			}),
		);

		assert.equal(block.number, 4001);
		assert.equal(block.parentHash, chainTip.hash);
		assert.equal(block.stateRoot, "c3458059d1354c4d6fa056051d3275add84f57dfddd7a60830573ad02ccd3901");
		assert.equal(
			block.logsBloom,
			"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000008000400000000000000000000000000000000000000000000000000000000000000000000800000000000200010000000000000000000000000000000000000008000000000000002000000000000000000000000000000000000000000000000000000000080800100000000000000000000000000000000000000400000000000000000000000000000000000000000000100000080000000000000000000000200000000000000000000000000000000000000000000",
		);
	});
});
