import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/snapshot-legacy-exporter";

import { Enums, Identifiers } from "@mainsail/constants";
import { ServiceProvider as CryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ConsensusAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as Validation } from "@mainsail/validation";
import { createHash } from "node:crypto";
import { brotliCompressSync } from "node:zlib";
import { decodeFunctionData, encodeErrorResult, toFunctionSelector } from "viem";

import { Importer } from "./importer";

type Wallet = Interfaces.LegacyWallet;

type Context = {
	app: Application;
	importer: Importer;
	configuration: {
		getGenesisHeight: () => number;
		getMilestone: () => Record<string, unknown>;
		getNetwork: () => { pubKeyHash: number };
	};
	evm: {
		getAccountInfo: (address: string) => Promise<{ balance: bigint; nonce: bigint }>;
		importAccountInfos: (accounts: unknown[]) => Promise<void>;
		importLegacyColdWallets: (wallets: unknown[]) => Promise<void>;
		prepareNextCommit: (context: unknown) => Promise<void>;
		process: (
			context: Contracts.Evm.TransactionContext,
		) => Promise<{ receipt: Partial<Contracts.Evm.TransactionReceipt> }>;
	};
	fileSystem: { existsSync: (path: string) => boolean; get: (path: string) => Promise<Buffer> };
	logger: { debug: (message: string) => void; info: (message: string) => void };
	resignedDelegate: Wallet;
	activeDelegate: Wallet;
	voter: Wallet;
	wallet: Wallet;
	coldWallet: Wallet;
};

const deployerAddress = "0x0000000000000000000000000000000000000001";
const consensusContractAddress = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1";
const usernamesContractAddress = "0x2c1DE3b4Dbb4aDebEbB5dcECAe825bE2a9fc6eb6";

const chainTip = { hash: "9525c5e676b4e85ee67a4100bd660150e920f65427f16b096db610966ef5c225", number: "1000" };
const commitKey = { blockHash: "0".repeat(64), blockNumber: 1001n, round: 0n };
const blsPublicKey = "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb";

const hotWallet = async (app: Application, mnemonic: string, fields: Partial<Wallet> = {}): Promise<Wallet> => {
	const { publicKey } = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(mnemonic);

	return {
		arkAddress: await app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
			.fromPublicKey(publicKey),
		balance: "100000000",
		ethAddress: await app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
			.fromPublicKey(publicKey),
		legacyNonce: "1",
		publicKey,
		...fields,
	};
};

const coldWallet = async (app: Application, mnemonic: string, fields: Partial<Wallet> = {}): Promise<Wallet> => {
	const { arkAddress } = await hotWallet(app, mnemonic);

	return { arkAddress, balance: "100000000", legacyNonce: "0", ...fields };
};

const makeSnapshot = (wallets: Wallet[], tip: Interfaces.LegacyChainTip = chainTip): Interfaces.LegacySnapshot => {
	const hash = createHash("sha256");
	hash.update(JSON.stringify(tip));
	for (const wallet of wallets) {
		hash.update(JSON.stringify(wallet));
	}

	return { chainTip: tip, hash: hash.digest("hex"), wallets };
};

const compress = (snapshot: Interfaces.LegacySnapshot): Buffer =>
	brotliCompressSync(Buffer.from(JSON.stringify(snapshot)));

const prepare = async (
	{ fileSystem, importer }: Context,
	wallets: Wallet[],
	tip: Interfaces.LegacyChainTip = chainTip,
): Promise<void> => {
	fileSystem.get = async () => compress(makeSnapshot(wallets, tip));

	await importer.prepare("snapshot.compressed");
};

const decodeCalls = (calls: unknown[]) =>
	(calls as Contracts.Evm.TransactionContext[]).map(({ data, to }) => {
		const { args, functionName } = decodeFunctionData({
			abi: to === consensusContractAddress ? ConsensusAbi.abi : UsernamesAbi.abi,
			data: `0x${data.toString("hex")}`,
		});

		return { args, functionName };
	});

const argument = <T>(fake: { getCallArgs: (index: number) => unknown[] }, index = 0): T =>
	fake.getCallArgs(index)[0] as T;

const statsOf = (logged: string[]) =>
	JSON.parse(logged.find((message) => message.startsWith("snapshot stats: "))!.slice("snapshot stats: ".length));

describe<Context>("Importer", ({ it, assert, beforeEach, each, spy }) => {
	beforeEach(async (context) => {
		context.configuration = {
			getGenesisHeight: () => 1001,
			getMilestone: () => ({ evmSpec: Enums.Evm.SpecId.OSAKA }),
			getNetwork: () => ({ pubKeyHash: 30 }),
		};
		context.fileSystem = { existsSync: () => true, get: async () => Buffer.alloc(0) };
		context.logger = { debug: () => {}, info: () => {} };
		context.evm = {
			getAccountInfo: async () => ({ balance: 0n, nonce: 0n }),
			importAccountInfos: async () => {},
			importLegacyColdWallets: async () => {},
			prepareNextCommit: async () => {},
			process: async () => ({ receipt: { status: 1 } }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue(context.fileSystem);
		context.app.bind("path.config").toConstantValue("/config");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
		context.app.bind(Identifiers.EvmConsensus.DeployerAddress).toConstantValue(deployerAddress);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Consensus).toConstantValue(consensusContractAddress);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Usernames).toConstantValue(usernamesContractAddress);

		await context.app.resolve<Validation>(Validation).register();
		await context.app.resolve<CryptoHashBcrypto>(CryptoHashBcrypto).register();
		await context.app.resolve<CryptoKeyPairEcdsa>(CryptoKeyPairEcdsa).register();
		await context.app.resolve<CryptoAddressBase58>(CryptoAddressBase58).register();
		await context.app.resolve<CryptoAddressKeccak256>(CryptoAddressKeccak256).register();

		context.resignedDelegate = await hotWallet(context.app, "resigned delegate", {
			attributes: { delegate: { resigned: true, username: "resigned_delegate" } },
			balance: "2500000000000",
			legacyNonce: "3",
		});
		context.activeDelegate = await hotWallet(context.app, "active delegate", {
			attributes: { delegate: { username: "active_delegate" } },
			balance: "1500000000000",
			legacyNonce: "2",
		});
		context.voter = await hotWallet(context.app, "voter", {
			attributes: { vote: context.resignedDelegate.publicKey },
			balance: "1000000000000",
		});
		context.wallet = await hotWallet(context.app, "hot wallet");
		context.coldWallet = await coldWallet(context.app, "cold wallet", { balance: "700000000" });

		context.importer = context.app.resolve(Importer);
	});

	it("should expose empty state before prepare", ({ importer }) => {
		assert.equal(importer.snapshotHash, "");
		assert.equal(importer.previousGenesisBlockHash, "");
		assert.equal(importer.genesisBlockNumber, 0n);
		assert.equal(importer.validators, []);
	});

	it("should continue the genesis block number after the chain tip", async (context) => {
		const { importer, wallet } = context;

		await prepare(context, [wallet]);

		assert.equal(importer.genesisBlockNumber, 1001n);
		assert.equal(importer.previousGenesisBlockHash, chainTip.hash);
		assert.equal(importer.snapshotHash, makeSnapshot([wallet]).hash);
	});

	it("should keep genesis block number 0 for a zero chain tip", async (context) => {
		const { importer, wallet } = context;

		await prepare(context, [wallet], { ...chainTip, number: "0" });

		assert.equal(importer.genesisBlockNumber, 0n);
	});

	it("should log the snapshot stats", async (context) => {
		const { activeDelegate, coldWallet, logger, resignedDelegate, voter } = context;
		const logged: string[] = [];
		logger.info = (message) => logged.push(message);

		await prepare(context, [resignedDelegate, activeDelegate, voter, coldWallet]);

		assert.equal(statsOf(logged), {
			coldWallets: 1,
			genesisBlockNumber: "1001",
			resignedValidators: 1,
			totalSupply: "50007000000000000000000",
			validators: 2,
			voters: 1,
			wallets: 4,
		});
	});

	each(
		"should reject a snapshot that does not match its hash (%s)",
		async ({ context, dataset }) => {
			const { fileSystem, importer, wallet, coldWallet } = context;
			const snapshot = makeSnapshot([wallet, coldWallet]);
			const tampered = {
				...snapshot,
				...(dataset === "balance" && { wallets: [{ ...wallet, balance: "1" }, coldWallet] }),
				...(dataset === "chain tip" && { chainTip: { ...chainTip, number: "999" } }),
				...(dataset === "wallet" && { wallets: [wallet] }),
			};
			fileSystem.get = async () => compress(tampered);

			await assert.rejects(
				() => importer.prepare("snapshot.compressed"),
				new Error(
					`failed to verify snapshot integrity: ${snapshot.hash} - ${makeSnapshot(tampered.wallets, tampered.chainTip).hash}`,
				),
			);
			assert.equal(importer.snapshotHash, "");
		},
		["balance", "chain tip", "wallet"],
	);

	it("should not read the snapshot again once prepared", async (context) => {
		const { fileSystem, importer, wallet } = context;
		await prepare(context, [wallet]);
		const get = spy(fileSystem, "get");

		await importer.prepare("snapshot.compressed");

		get.neverCalled();
	});

	it("should read a brotli compressed snapshot", async ({ fileSystem, importer, wallet }) => {
		fileSystem.get = async () => compress(makeSnapshot([wallet]));
		const get = spy(fileSystem, "get");

		await importer.prepare("/path/to/snapshot.compressed");

		get.calledOnce();
		get.calledWith("/path/to/snapshot.compressed");
		assert.equal(importer.snapshotHash, makeSnapshot([wallet]).hash);
	});

	it("should reject a snapshot that cannot be read", async ({ fileSystem, importer }) => {
		fileSystem.get = async () => {
			throw new Error("ENOENT: no such file or directory");
		};

		await assert.rejects(
			() => importer.prepare("snapshot.compressed"),
			new Error("failed to read snapshot snapshot.compressed: ENOENT: no such file or directory"),
		);
	});

	it("should reject a corrupt snapshot", async ({ fileSystem, importer }) => {
		fileSystem.get = async () => Buffer.from("not brotli");

		await assert.rejects(
			() => importer.prepare("snapshot.compressed"),
			"failed to read snapshot snapshot.compressed: ",
		);
	});

	it("should skip the negative-balance genesis wallet", async (context) => {
		const { app, evm, importer, wallet, coldWallet } = context;
		const genesisWallet = await hotWallet(app, "genesis wallet", { balance: "-12500000000000000" });
		const importAccountInfos = spy(evm, "importAccountInfos");

		await prepare(context, [genesisWallet, wallet, coldWallet]);
		const result = await importer.import({ commitKey, timestamp: 0 });

		assert.equal(
			argument<Contracts.Evm.AccountInfoExtended[]>(importAccountInfos).map(({ address }) => address),
			[wallet.ethAddress],
		);
		assert.equal(result.initialTotalSupply, 8_000_000_000_000_000_000n);
	});

	it("should import a cold wallet exported with a null public key", async (context) => {
		const { coldWallet, evm, importer } = context;
		const importLegacyColdWallets = spy(evm, "importLegacyColdWallets");

		await prepare(context, [{ ...coldWallet, attributes: null, publicKey: null } as unknown as Wallet]);
		await importer.import({ commitKey, timestamp: 0 });

		importLegacyColdWallets.calledWith([
			{
				address: coldWallet.arkAddress,
				balance: 7_000_000_000_000_000_000n,
				legacyAttributes: { legacyNonce: 0n, multiSignature: undefined, secondPublicKey: undefined },
			},
		]);
	});

	it("should import hot wallets as accounts and cold wallets by their legacy address", async (context) => {
		const { app, coldWallet, evm, importer, voter, resignedDelegate } = context;
		const zeroBalance = await hotWallet(app, "zero balance", { balance: "0", legacyNonce: "0" });
		const importAccountInfos = spy(evm, "importAccountInfos");
		const importLegacyColdWallets = spy(evm, "importLegacyColdWallets");

		await prepare(context, [resignedDelegate, voter, zeroBalance, coldWallet]);
		await importer.import({ commitKey, timestamp: 0 });

		importAccountInfos.calledOnce();
		importAccountInfos.calledWith([
			{
				address: resignedDelegate.ethAddress,
				balance: 25_000_000_000_000_000_000_000n,
				legacyAttributes: { legacyNonce: 3n, multiSignature: undefined, secondPublicKey: undefined },
				nonce: 0n,
			},
			{
				address: voter.ethAddress,
				balance: 10_000_000_000_000_000_000_000n,
				legacyAttributes: { legacyNonce: 1n, multiSignature: undefined, secondPublicKey: undefined },
				nonce: 0n,
			},
			{
				address: zeroBalance.ethAddress,
				balance: 0n,
				legacyAttributes: { legacyNonce: 0n, multiSignature: undefined, secondPublicKey: undefined },
				nonce: 0n,
			},
		]);
		importLegacyColdWallets.calledOnce();
		importLegacyColdWallets.calledWith([
			{
				address: coldWallet.arkAddress,
				balance: 7_000_000_000_000_000_000n,
				legacyAttributes: { legacyNonce: 0n, multiSignature: undefined, secondPublicKey: undefined },
			},
		]);
	});

	it("should keep a second public key as a legacy attribute", async (context) => {
		const { activeDelegate, evm, importer, voter } = context;
		const importAccountInfos = spy(evm, "importAccountInfos");

		await prepare(context, [
			{ ...voter, attributes: { secondPublicKey: activeDelegate.publicKey } },
			{
				...activeDelegate,
				attributes: { ...activeDelegate.attributes, secondPublicKey: activeDelegate.publicKey },
			},
		]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(
			argument<Contracts.Evm.AccountInfoExtended[]>(importAccountInfos).map(
				({ legacyAttributes }) => legacyAttributes.secondPublicKey,
			),
			[activeDelegate.publicKey, activeDelegate.publicKey],
		);
	});

	it("should keep a multisignature attribute as a legacy attribute", async (context) => {
		const { activeDelegate, evm, importer, resignedDelegate, voter } = context;
		const importAccountInfos = spy(evm, "importAccountInfos");
		const multiSignature = { min: 2, publicKeys: [activeDelegate.publicKey!, resignedDelegate.publicKey!] };

		await prepare(context, [{ ...voter, attributes: { multiSignature } }]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(
			argument<Contracts.Evm.AccountInfoExtended[]>(importAccountInfos)[0].legacyAttributes.multiSignature,
			multiSignature,
		);
	});

	it("should read V3's resigned flag", async (context) => {
		const { activeDelegate, importer, resignedDelegate, voter } = context;

		await prepare(context, [resignedDelegate, activeDelegate, voter]);

		assert.equal(importer.validators, [
			{ ethAddress: resignedDelegate.ethAddress, isResigned: true, username: "resigned_delegate" },
			{ ethAddress: activeDelegate.ethAddress, isResigned: false, username: "active_delegate" },
		]);
	});

	it("should import a delegate with a V3 BLS key as dormant", async (context) => {
		const { activeDelegate, evm, importer } = context;
		const process = spy(evm, "process");

		await prepare(context, [
			{ ...activeDelegate, attributes: { delegate: { blsPublicKey, username: "active_delegate" } } },
		]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(importer.validators, [
			{ ethAddress: activeDelegate.ethAddress, isResigned: false, username: "active_delegate" },
		]);
		process.calledTimes(2);
		assert.equal(decodeCalls([argument(process, 0), argument(process, 1)]), [
			{ args: [activeDelegate.ethAddress, false], functionName: "addValidator" },
			{ args: [activeDelegate.ethAddress, "active_delegate"], functionName: "addUsername" },
		]);
	});

	it("should reject a delegate without a public key", async (context) => {
		const { coldWallet } = context;

		await assert.rejects(
			() => prepare(context, [{ ...coldWallet, attributes: { delegate: { username: "cold_delegate" } } }]),
			new Error("delegate is missing public key"),
		);
	});

	it("should not add a username for a delegate without one", async (context) => {
		const { activeDelegate, evm, importer } = context;
		const process = spy(evm, "process");

		await prepare(context, [{ ...activeDelegate, attributes: { delegate: { username: "" } } }]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(decodeCalls([argument(process)]), [
			{ args: [activeDelegate.ethAddress, false], functionName: "addValidator" },
		]);
		process.calledOnce();
	});

	it("should import a resigned delegate as resigned and keep its votes", async (context) => {
		const { activeDelegate, evm, importer, resignedDelegate, voter } = context;
		const process = spy(evm, "process");

		await prepare(context, [resignedDelegate, activeDelegate, voter]);
		await importer.import({ commitKey, timestamp: 0 });

		process.calledTimes(5);
		assert.equal(decodeCalls(Array.from({ length: 5 }, (_, index) => argument(process, index))), [
			{ args: [resignedDelegate.ethAddress, true], functionName: "addValidator" },
			{ args: [activeDelegate.ethAddress, false], functionName: "addValidator" },
			{ args: [[voter.ethAddress], [resignedDelegate.ethAddress]], functionName: "addVotes" },
			{ args: [resignedDelegate.ethAddress, "resigned_delegate"], functionName: "addUsername" },
			{ args: [activeDelegate.ethAddress, "active_delegate"], functionName: "addUsername" },
		]);
	});

	it("should resolve a vote for a delegate listed after the voter", async (context) => {
		const { activeDelegate, evm, importer, voter } = context;
		const process = spy(evm, "process");

		await prepare(context, [{ ...voter, attributes: { vote: activeDelegate.publicKey } }, activeDelegate]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(decodeCalls([argument(process, 1)]), [
			{ args: [[voter.ethAddress], [activeDelegate.ethAddress]], functionName: "addVotes" },
		]);
	});

	it("should reject import before prepare", async ({ evm, importer }) => {
		const prepareNextCommit = spy(evm, "prepareNextCommit");

		await assert.rejects(() => importer.import({ commitKey, timestamp: 0 }), new Error("snapshot is not prepared"));
		prepareNextCommit.neverCalled();
	});

	it("should reject a second import", async (context) => {
		const { evm, importer, wallet } = context;
		await prepare(context, [wallet]);
		await importer.import({ commitKey, timestamp: 0 });
		const prepareNextCommit = spy(evm, "prepareNextCommit");

		await assert.rejects(
			() => importer.import({ commitKey, timestamp: 0 }),
			new Error("snapshot already imported"),
		);
		prepareNextCommit.neverCalled();
	});

	it("should prepare the next commit for the snapshot", async (context) => {
		const { evm, importer, wallet } = context;
		const prepareNextCommit = spy(evm, "prepareNextCommit");

		await prepare(context, [wallet]);
		await importer.import({ commitKey, timestamp: 1_700_000_000_000 });

		prepareNextCommit.calledOnce();
		prepareNextCommit.calledWith({
			blockContext: {
				commitKey,
				gasLimit: 250_000_000n,
				prevrandao: Buffer.alloc(32),
				timestamp: 1_700_000_000_000n,
				validatorAddress: deployerAddress,
			},
		});
	});

	it("should continue the deployer nonce", async (context) => {
		const { activeDelegate, evm, importer, resignedDelegate, voter } = context;
		evm.getAccountInfo = async () => ({ balance: 0n, nonce: 6n });
		const process = spy(evm, "process");

		await prepare(context, [resignedDelegate, activeDelegate, voter]);
		await importer.import({ commitKey, timestamp: 0 });

		assert.equal(
			Array.from({ length: 5 }, (_, index) => {
				const { commitKey, from, gasLimit, gasPrice, nonce, specId, to, txHash, value } =
					argument<Contracts.Evm.TransactionContext>(process, index);

				return { commitKey, from, gasLimit, gasPrice, nonce, specId, to, txHash, value };
			}),
			[6n, 7n, 8n, 9n, 10n].map((nonce, index) => ({
				commitKey,
				from: deployerAddress,
				gasLimit: 200_000_000n,
				gasPrice: 0n,
				nonce,
				specId: Enums.Evm.SpecId.OSAKA,
				to: index < 3 ? consensusContractAddress : usernamesContractAddress,
				txHash: createHash("sha256").update(`tx-${deployerAddress}-${nonce}`).digest("hex"),
				value: 0n,
			})),
		);
	});

	it("should import wallets and votes in batches of 1000", async (context) => {
		const { activeDelegate, app, evm, importer } = context;
		const voters = await Promise.all(
			Array.from({ length: 2001 }, (_, index) =>
				hotWallet(app, `voter ${index}`, { attributes: { vote: activeDelegate.publicKey } }),
			),
		);
		const coldWallets = await Promise.all(
			Array.from({ length: 2001 }, (_, index) => coldWallet(app, `cold wallet ${index}`)),
		);
		const importAccountInfos = spy(evm, "importAccountInfos");
		const importLegacyColdWallets = spy(evm, "importLegacyColdWallets");
		const process = spy(evm, "process");

		await prepare(context, [activeDelegate, ...voters, ...coldWallets]);
		const result = await importer.import({ commitKey, timestamp: 0 });

		assert.equal(
			[0, 1, 2].map((index) => argument<unknown[]>(importAccountInfos, index).length),
			[1000, 1000, 2],
		);
		assert.equal(
			[0, 1, 2].map((index) => argument<unknown[]>(importLegacyColdWallets, index).length),
			[1000, 1000, 1],
		);
		assert.equal(
			decodeCalls([1, 2, 3].map((index) => argument(process, index))).map(({ args }) => args![0]),
			[
				voters.slice(1001).map(({ ethAddress }) => ethAddress),
				voters.slice(1, 1001).map(({ ethAddress }) => ethAddress),
				[voters[0].ethAddress],
			],
		);
		assert.equal(result.importedVoters, 2001);
	});

	it("should return the import counts and the total supply", async (context) => {
		const { activeDelegate, coldWallet, importer, resignedDelegate, voter } = context;

		await prepare(context, [resignedDelegate, activeDelegate, voter, coldWallet]);

		assert.equal(await importer.import({ commitKey, timestamp: 0 }), {
			importedUsernames: 2,
			importedValidators: 2,
			importedVoters: 1,
			initialTotalSupply: 50_007_000_000_000_000_000_000n,
		});
	});

	each(
		"should fail when %s reverts",
		async ({ context, dataset }) => {
			const { activeDelegate, evm, importer, resignedDelegate, voter } = context;
			const reverts = {
				addUsername: {
					error: `failed to add username resigned_delegate for ${resignedDelegate.ethAddress}: TakenUsername`,
					output: encodeErrorResult({ abi: UsernamesAbi.abi, errorName: "TakenUsername" }),
				},
				addValidator: {
					error: `failed to add validator ${resignedDelegate.ethAddress}: ValidatorAlreadyRegistered`,
					output: encodeErrorResult({ abi: ConsensusAbi.abi, errorName: "ValidatorAlreadyRegistered" }),
				},
				addVotes: {
					error: `failed to add 1 votes starting with ${voter.ethAddress}: ValidatorNotRegistered`,
					output: encodeErrorResult({ abi: ConsensusAbi.abi, errorName: "ValidatorNotRegistered" }),
				},
			}[dataset];
			evm.process = async ({ data }) =>
				data.subarray(0, 4).toString("hex") ===
				toFunctionSelector(
					[...ConsensusAbi.abi, ...UsernamesAbi.abi].find(
						(item) => item.type === "function" && item.name === dataset,
					) as never,
				).slice(2)
					? { receipt: { gasUsed: 0n, output: Buffer.from(reverts.output.slice(2), "hex"), status: 0 } }
					: { receipt: { status: 1 } };
			const process = spy(evm, "process");

			await prepare(context, [resignedDelegate, activeDelegate, voter]);

			await assert.rejects(() => importer.import({ commitKey, timestamp: 0 }), new Error(reverts.error));
			process.calledTimes({ addUsername: 4, addValidator: 1, addVotes: 3 }[dataset]);
		},
		["addValidator", "addVotes", "addUsername"] as const,
	);

	it("should drain every wallet and then dispose", async (context) => {
		const { coldWallet, importer, resignedDelegate, voter } = context;
		await prepare(context, [resignedDelegate, voter, coldWallet]);

		assert.equal(importer.validators.length, 1);
		assert.equal(importer.genesisBlockNumber, 1001n);
		assert.equal(importer.previousGenesisBlockHash, chainTip.hash);
		assert.equal(
			[...importer.drain()].map(({ arkAddress }) => arkAddress),
			[coldWallet.arkAddress, voter.arkAddress, resignedDelegate.arkAddress],
		);
		assert.equal(importer.validators, []);
		assert.equal(importer.snapshotHash, "");
		assert.equal(importer.genesisBlockNumber, 0n);
		assert.equal(importer.previousGenesisBlockHash, "");
		assert.equal([...importer.drain()], []);
		await assert.rejects(() => importer.import({ commitKey, timestamp: 0 }), new Error("snapshot is not prepared"));
	});

	it("should prepare again after dispose", async (context) => {
		const { fileSystem, importer, wallet } = context;
		await prepare(context, [wallet]);
		await importer.import({ commitKey, timestamp: 0 });
		const get = spy(fileSystem, "get");

		importer.dispose();
		importer.dispose();

		assert.equal(importer.genesisBlockNumber, 0n);
		await importer.prepare("snapshot.compressed");
		get.calledOnce();
		assert.equal(importer.genesisBlockNumber, 1001n);
		await importer.import({ commitKey, timestamp: 0 });
	});

	it("should prepare the restore from the milestone snapshot", async ({
		configuration,
		fileSystem,
		importer,
		wallet,
	}) => {
		const snapshot = makeSnapshot([wallet]);
		configuration.getMilestone = () => ({ snapshot: { snapshotHash: snapshot.hash } });
		fileSystem.get = async () => compress(snapshot);
		const get = spy(fileSystem, "get");

		await importer.prepareRestore();

		get.calledWith(`/config/snapshot/${snapshot.hash}.compressed`);
		assert.equal(importer.snapshotHash, snapshot.hash);
	});

	it("should reject a restore without a snapshot milestone", async ({ importer }) => {
		await assert.rejects(
			() => importer.prepareRestore(),
			new Error('Expected value which is "non-null and non-undefined".'),
		);
	});

	it("should import the snapshot for the genesis commit", async ({
		configuration,
		evm,
		fileSystem,
		importer,
		logger,
		wallet,
	}) => {
		const snapshot = makeSnapshot([wallet]);
		configuration.getMilestone = () => ({
			evmSpec: Enums.Evm.SpecId.OSAKA,
			snapshot: { snapshotHash: snapshot.hash },
		});
		fileSystem.get = async () => compress(snapshot);
		const prepareNextCommit = spy(evm, "prepareNextCommit");
		const logged: string[] = [];
		logger.info = (message) => logged.push(message);

		const result = await importer.run({
			block: {
				hash: "1".repeat(64),
				number: 1001,
				parentHash: chainTip.hash,
				round: 0,
				timestamp: 1_700_000_000_000,
			},
		} as Contracts.Crypto.Commit);

		assert.equal(result, {
			importedUsernames: 0,
			importedValidators: 0,
			importedVoters: 0,
			initialTotalSupply: 1_000_000_000_000_000_000n,
		});
		assert.equal(argument(prepareNextCommit), {
			blockContext: {
				commitKey: { blockHash: "1".repeat(64), blockNumber: 1001n, round: 0n },
				gasLimit: 250_000_000n,
				prevrandao: Buffer.alloc(32),
				timestamp: 1_700_000_000_000n,
				validatorAddress: deployerAddress,
			},
		});
		assert.true(
			logged.includes(
				`snapshot import result: ${JSON.stringify({ ...result, initialTotalSupply: "1000000000000000000" })}`,
			),
		);
	});

	it("should reject a genesis commit without a snapshot milestone", async ({ importer }) => {
		await assert.rejects(
			() => importer.run({ block: { parentHash: chainTip.hash } } as Contracts.Crypto.Commit),
			new Error(`genesis block has parent hash ${chainTip.hash} but no snapshot milestone`),
		);
	});

	it("should reject a snapshot that does not match the milestone", async ({
		configuration,
		evm,
		fileSystem,
		importer,
		wallet,
	}) => {
		const snapshot = makeSnapshot([wallet]);
		configuration.getMilestone = () => ({ snapshot: { snapshotHash: "f".repeat(64) } });
		fileSystem.get = async () => compress(snapshot);
		const prepareNextCommit = spy(evm, "prepareNextCommit");

		await assert.rejects(
			() => importer.run({ block: { parentHash: chainTip.hash } } as Contracts.Crypto.Commit),
			new Error(`snapshot hash ${snapshot.hash} does not match milestone snapshot ${"f".repeat(64)}`),
		);
		prepareNextCommit.neverCalled();
	});

	it("should reject a genesis block that does not follow the chain tip", async ({
		configuration,
		evm,
		fileSystem,
		importer,
		wallet,
	}) => {
		const snapshot = makeSnapshot([wallet]);
		configuration.getMilestone = () => ({ snapshot: { snapshotHash: snapshot.hash } });
		fileSystem.get = async () => compress(snapshot);
		const prepareNextCommit = spy(evm, "prepareNextCommit");

		await assert.rejects(
			() => importer.run({ block: { parentHash: "e".repeat(64) } } as Contracts.Crypto.Commit),
			new Error(`snapshot chain tip ${chainTip.hash} does not match genesis parent hash ${"e".repeat(64)}`),
		);
		prepareNextCommit.neverCalled();
	});
});
