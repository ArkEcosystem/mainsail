import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { RandaoVerifier } from "./randao-verifier.js";

describe<{
	app: Application;
	verifier: RandaoVerifier;
	configuration: any;
	consensusSignature: any;
	stateStore: any;
	validatorSet: any;
	unit: any;
}>("RandaoVerifier", ({ it, beforeEach, assert, spy }) => {
	const genesisHash = "27184b900e6f6a44eb0e1f0923b8214b351eee6b3736e8c07f75e5019bee2a92";
	const blsPublicKey = "a".repeat(96);
	const randaoReveal = "b".repeat(192);

	const makeUnit = (blockNumber: number) => ({
		blockNumber,
		getBlock: () => ({
			hash: "c".repeat(64),
			number: blockNumber,
			proposer: "0x0000000000000000000000000000000000000001",
			randaoReveal,
		}),
	});

	beforeEach((context) => {
		context.configuration = { getGenesisHeight: () => 0 };
		context.consensusSignature = { verify: async () => true };
		context.stateStore = { getGenesisCommit: () => ({ block: { hash: genesisHash } }) };
		context.validatorSet = {
			getValidator: () => ({ blsPublicKey }),
			getValidatorIndexByWalletAddress: () => 0,
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue(context.consensusSignature)
			.whenTagged("type", "consensus");
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.verifier = context.app.resolve(RandaoVerifier);
		context.unit = makeUnit(2);
	});

	it("should skip verification for the genesis block", async ({ verifier, consensusSignature }) => {
		const verify = spy(consensusSignature, "verify");

		await verifier.execute(makeUnit(0));

		verify.neverCalled();
	});

	it("should accept a valid reveal", async ({ verifier, unit, consensusSignature }) => {
		const verify = spy(consensusSignature, "verify");

		await verifier.execute(unit);

		verify.calledOnce();
	});

	it("should verify the reveal against the domain-separated message and the proposer key", async ({
		verifier,
		unit,
		consensusSignature,
	}) => {
		let captured;
		consensusSignature.verify = async (signature, message, publicKey) => {
			captured = { message, publicKey, signature };
			return true;
		};

		await verifier.execute(unit);

		assert.equal(captured.signature, Buffer.from(randaoReveal, "hex"));
		assert.equal(captured.publicKey, Buffer.from(blsPublicKey, "hex"));

		const expectedBlockNumber = Buffer.alloc(4);
		expectedBlockNumber.writeUInt32BE(2, 0);
		assert.equal(
			captured.message,
			Buffer.concat([Buffer.from("MAINSAIL_RANDAO"), Buffer.from(genesisHash, "hex"), expectedBlockNumber]),
		);
	});

	it("should throw on an invalid reveal", async ({ verifier, unit, consensusSignature }) => {
		consensusSignature.verify = async () => false;

		await assert.rejects(() => verifier.execute(unit), "has an invalid randao reveal");
	});
});
