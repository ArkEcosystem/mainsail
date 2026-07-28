import { Identifiers } from "@mainsail/constants";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { encodeFunctionData, encodeFunctionResult, toBytes } from "viem";

import { ConsensusContractCaller } from "./consensus-contract-caller.js";

const DEPLOYER = "0x0000000000000000000000000000000000000001";
const CONSENSUS = "0x00000000000000000000000000000000000000aa";
const EVM_SPEC = "Latest";

const encodeOutput = (functionName: string, result: unknown): Buffer =>
	Buffer.from(toBytes(encodeFunctionResult({ abi: ConsensusAbi.abi, functionName, result })));

describe<{
	app: Application;
	configuration: any;
	evm: any;
	caller: ConsensusContractCaller;
}>("ConsensusContractCaller", ({ it, beforeEach, assert, stub }) => {
	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ evmSpec: EVM_SPEC }) };
		context.evm = {
			view: async () => ({ output: encodeOutput("getVotesCount", 0n), success: true }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
		context.app.bind(Identifiers.EvmConsensus.DeployerAddress).toConstantValue(DEPLOYER);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Consensus).toConstantValue(CONSENSUS);

		context.caller = context.app.resolve(ConsensusContractCaller);
	});

	it("#view - should build the view context and decode the result", async ({ evm, caller }) => {
		let captured: any;
		evm.view = async (context: any) => {
			captured = context;
			return { output: encodeOutput("getVotesCount", 5n), success: true };
		};

		const result = await caller.view<bigint>("getVotesCount");

		assert.equal(result, 5n);
		assert.equal(captured.from, DEPLOYER);
		assert.equal(captured.to, CONSENSUS);
		assert.equal(captured.specId, EVM_SPEC);
		assert.equal(
			Buffer.from(captured.data).toString("hex"),
			encodeFunctionData({ abi: ConsensusAbi.abi, args: undefined, functionName: "getVotesCount" }).slice(2),
		);
	});

	it("#view - should forward arguments to the encoded call data", async ({ evm, caller }) => {
		let captured: any;
		evm.view = async (context: any) => {
			captured = context;
			return { output: encodeOutput("getVotes", []), success: true };
		};

		const args = ["0x0000000000000000000000000000000000000000", 100];
		await caller.view("getVotes", args);

		assert.equal(
			Buffer.from(captured.data).toString("hex"),
			encodeFunctionData({ abi: ConsensusAbi.abi, args, functionName: "getVotes" }).slice(2),
		);
	});

	it("#view - should terminate the application when the call fails", async ({ app, evm, caller }) => {
		evm.view = async () => ({ output: undefined, success: false });
		const terminate = stub(app, "terminate").callsFake(() => {
			throw new Error("terminated");
		});

		await assert.rejects(() => caller.view("getVotesCount"), "terminated");
		terminate.calledWith("getVotesCount failed");
	});
});
