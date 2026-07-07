import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { getCreateAddress } from "viem";

import { Deployer } from "./deployer.js";

const DEPLOYER_ADDRESS = "0x0000000000000000000000000000000000000001";
const WRONG_ADDRESS = "0x00000000000000000000000000000000000000ff";
const addressForNonce = (nonce: bigint | number): string =>
	getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: BigInt(nonce) });

describe<{
	app: Application;
	configuration: any;
	events: any;
	logger: any;
	hashFactory: any;
	evm: any;
	genesisInfo: any;
	deployer: Deployer;
}>("Deployer", ({ it, beforeEach, assert, spy, stub }) => {
	const setup = (
		context: any,
		{
			consensus = addressForNonce(1),
			usernames = addressForNonce(3),
			multiPayment = addressForNonce(5),
		}: { consensus?: string; usernames?: string; multiPayment?: string } = {},
	) => {
		context.evm = {
			getReceipt: async () => ({ receipt: undefined }),
			initializeGenesis: async () => {},
			onCommit: async () => {},
			prepareNextCommit: async () => {},
			process: async (transactionContext: any) => ({
				receipt: { contractAddress: addressForNonce(transactionContext.nonce), status: true },
			}),
		};
		context.events = { dispatch: async () => {} };
		context.logger = { info: () => {} };
		context.configuration = {
			getMilestone: () => ({
				block: { maxGasLimit: 30_000_000 },
				evmSpec: "shanghai",
				validatorRegistrationFee: 100n,
			}),
		};
		context.hashFactory = { sha256: () => Buffer.from("00", "hex") };
		context.genesisInfo = {
			account: "0xacc",
			deployerAccount: DEPLOYER_ADDRESS,
			initialBlockNumber: 0n,
			initialSupply: 1000n,
			timestamp: 123n,
			usernameContract: usernames,
			validatorContract: consensus,
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue(context.hashFactory);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
		context.app.bind(Identifiers.EvmConsensus.DeployerAddress).toConstantValue(DEPLOYER_ADDRESS);
		context.app.bind(Identifiers.EvmConsensus.GenesisInfo).toConstantValue(context.genesisInfo);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Consensus).toConstantValue(consensus);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Usernames).toConstantValue(usernames);
		context.app.bind(Identifiers.EvmConsensus.Contracts.MultiPayment).toConstantValue(multiPayment);

		context.deployer = context.app.resolve(Deployer);
	};

	beforeEach((context) => setup(context));

	it("should initialize genesis and deploy all contracts and proxies", async ({
		deployer,
		evm,
		events,
		genesisInfo,
	}) => {
		const prepare = spy(evm, "prepareNextCommit");
		const initialize = spy(evm, "initializeGenesis");
		const process = spy(evm, "process");
		const onCommit = spy(evm, "onCommit");
		const dispatch = spy(events, "dispatch");

		await deployer.deploy();

		prepare.calledOnce();
		initialize.calledWith(genesisInfo);
		process.calledTimes(6); // 3 implementations + 3 proxies
		onCommit.calledOnce();
		dispatch.calledTimes(3); // one ContractCreated event per proxy
	});

	it("should reuse existing receipts and skip processing and committing on restart", async ({ deployer, evm }) => {
		let index = 0;
		stub(evm, "getReceipt").callsFake(async () => ({
			receipt: { contractAddress: addressForNonce(index++), status: true },
		}));
		const process = spy(evm, "process");
		const onCommit = spy(evm, "onCommit");

		await deployer.deploy();

		process.neverCalled();
		onCommit.neverCalled();
	});

	it("should throw when a deployment transaction fails", async ({ deployer, evm }) => {
		stub(evm, "process").resolvedValue({ receipt: { contractAddress: addressForNonce(0), status: false } });

		await assert.rejects(() => deployer.deploy(), "Failed to deploy Consensus contract");
	});

	it("should throw when a deployed contract address does not match the expected address", async ({
		deployer,
		evm,
	}) => {
		stub(evm, "process").resolvedValue({ receipt: { contractAddress: WRONG_ADDRESS, status: true } });

		await assert.rejects(() => deployer.deploy(), "Contract address mismatch");
	});

	it("should throw when a proxy address does not match the bound contract address", async (context) => {
		setup(context, { consensus: WRONG_ADDRESS });

		await assert.rejects(() => context.deployer.deploy(), "Contract address mismatch");
	});
});
