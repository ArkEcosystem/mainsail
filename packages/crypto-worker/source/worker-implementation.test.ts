import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { WorkerImplementation } from "./worker-implementation";

describe<{
	app: Application;
	impl: WorkerImplementation;
	consensusSignature: any;
	walletSignature: any;
	blockFactory: any;
	transactionFactory: any;
	publicKeyFactory: any;
}>("WorkerImplementation", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.consensusSignature = { aggregate: async () => "aggregated", sign: async () => "signature" };
		context.walletSignature = { signRecoverable: async () => ({ r: "r", s: "s", v: 0 }) };
		context.blockFactory = { fromHex: async () => ({ block: true }) };
		context.transactionFactory = { fromHex: async () => ({ transaction: true }) };
		context.publicKeyFactory = { fromMnemonic: async () => "public-key" };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(context.blockFactory);
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.transactionFactory);
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue(context.consensusSignature)
			.whenTagged("type", "consensus");
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue(context.walletSignature)
			.whenTagged("type", "wallet");
		context.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Factory)
			.toConstantValue(context.publicKeyFactory)
			.whenTagged("type", "consensus");

		context.impl = context.app.resolve(WorkerImplementation);
	});

	it("calls the method on the consensus signature and returns its result", async ({ impl, consensusSignature }) => {
		const sign = spy(consensusSignature, "sign");
		const message = Buffer.from("message");
		const privateKey = Buffer.from("private-key");

		const result = await impl.callConsensusSignature("sign", [message, privateKey]);

		sign.calledWith(message, privateKey);
		assert.equal(result, "signature");
	});

	it("revives a serialized Buffer argument before forwarding it", async ({ impl, consensusSignature }) => {
		const sign = spy(consensusSignature, "sign");

		// The IPC channel serializes Buffers to { type: "Buffer", data: [...] }.
		await impl.callConsensusSignature("sign", [
			{ data: [1, 2, 3], type: "Buffer" },
			{ data: [4, 5, 6], type: "Buffer" },
		] as any);

		sign.calledWith(Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6]));
	});

	it("revives an array of serialized Buffers before forwarding it", async ({ impl, consensusSignature }) => {
		const aggregate = spy(consensusSignature, "aggregate");

		await impl.callConsensusSignature("aggregate", [
			[
				{ data: [1], type: "Buffer" },
				{ data: [2], type: "Buffer" },
			],
		] as any);

		aggregate.calledWith([Buffer.from([1]), Buffer.from([2])]);
	});

	it("leaves non-Buffer arguments untouched", async ({ impl, publicKeyFactory }) => {
		const fromMnemonic = spy(publicKeyFactory, "fromMnemonic");

		await impl.callPublicKeyFactory("fromMnemonic", ["clay harbor essay analyst"]);

		fromMnemonic.calledWith("clay harbor essay analyst");
	});

	it("throws when the requested method does not exist on the target", async ({ impl }) => {
		await assert.rejects(
			() => impl.callBlockFactory("missing" as any, [] as any),
			'property "missing" is not a function',
		);
	});

	it("routes wallet signature calls to the wallet-tagged signature", async ({ impl, walletSignature }) => {
		const signRecoverable = spy(walletSignature, "signRecoverable");
		const message = Buffer.from("message");
		const privateKey = Buffer.from("private-key");

		await impl.callWalletSignature("signRecoverable", [message, privateKey]);

		signRecoverable.calledWith(message, privateKey);
	});

	it("routes block factory calls to the block factory", async ({ impl, blockFactory }) => {
		const fromHex = spy(blockFactory, "fromHex");

		const result = await impl.callBlockFactory("fromHex", ["0a1b2c3d"]);

		fromHex.calledWith("0a1b2c3d");
		assert.equal(result, { block: true });
	});

	it("routes transaction factory calls to the transaction factory", async ({ impl, transactionFactory }) => {
		const fromHex = spy(transactionFactory, "fromHex");

		const result = await impl.callTransactionFactory("fromHex", ["ff00ff"]);

		fromHex.calledWith("ff00ff");
		assert.equal(result, { transaction: true });
	});
});
