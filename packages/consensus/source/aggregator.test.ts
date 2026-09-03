import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Aggregator } from "./aggregator";

describe<{
	app: Application;
	aggregator: Aggregator;
	validatorSet: any;
	worker: any;
	workerPool: any;
}>("Aggregator", ({ it, assert, beforeEach, stub, spy }) => {
	const roundValidators = 4;

	const aggregatedSignature = "cc".repeat(96);
	const aggregatedPublicKey = "dd".repeat(48);

	// Deterministic per-validator material so the buffers handed to the worker can be checked.
	const publicKey = (index: number): string => Buffer.alloc(48, index + 1).toString("hex");
	const signature = (index: number): string => Buffer.alloc(96, 0x10 + index).toString("hex");

	const makeSignatures = (indexes: number[]): Map<number, { signature: string }> =>
		new Map(indexes.map((index) => [index, { signature: signature(index) }]));

	const publicKeyBuffers = (indexes: number[]): Buffer[] =>
		indexes.map((index) => Buffer.from(publicKey(index), "hex"));
	const signatureBuffers = (indexes: number[]): Buffer[] =>
		indexes.map((index) => Buffer.from(signature(index), "hex"));

	beforeEach((context) => {
		context.validatorSet = {
			// Mirrors ValidatorSet.getValidator, which throws for an index outside the active set.
			getValidator: (index: number) => {
				if (index < 0 || index >= roundValidators) {
					throw new Error(`Validator at index ${index} not found.`);
				}

				return { blsPublicKey: publicKey(index) };
			},
		};
		context.worker = {
			consensusSignature: async () => aggregatedSignature,
			publicKeyFactory: async () => aggregatedPublicKey,
		};
		context.workerPool = {
			getWorker: () => context.worker,
		};

		context.app = new Application();
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(context.workerPool);

		context.aggregator = context.app.resolve(Aggregator);
	});

	it("#aggregate - should aggregate the signatures and mark the validators that signed", async ({
		aggregator,
		worker,
	}) => {
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(aggregatedSignature);

		const result = await aggregator.aggregate(makeSignatures([0, 2, 3]), roundValidators);

		assert.equal(result, { signature: aggregatedSignature, validators: [true, false, true, true] });
		consensusSignature.calledOnce();
		consensusSignature.calledWith("aggregate", signatureBuffers([0, 2, 3]));
	});

	it("#aggregate - should hand the signatures to the worker in map order", async ({ aggregator, worker }) => {
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(aggregatedSignature);

		const result = await aggregator.aggregate(makeSignatures([3, 0, 2]), roundValidators);

		// BLS aggregation is order independent; the bitmap is positional regardless of insertion order.
		assert.equal(result.validators, [true, false, true, true]);
		consensusSignature.calledWith("aggregate", signatureBuffers([3, 0, 2]));
	});

	it("#aggregate - should accept exactly the majority threshold", async ({ aggregator, worker }) => {
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(aggregatedSignature);

		// 3 of 4 is the smallest count above 2/3.
		const result = await aggregator.aggregate(makeSignatures([0, 1, 2]), roundValidators);

		assert.equal(result.validators, [true, true, true, false]);
		consensusSignature.calledOnce();
	});

	it("#aggregate - should aggregate a single signature when the round has one validator", async ({
		aggregator,
		worker,
	}) => {
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(aggregatedSignature);

		const result = await aggregator.aggregate(makeSignatures([0]), 1);

		assert.equal(result, { signature: aggregatedSignature, validators: [true] });
		consensusSignature.calledWith("aggregate", signatureBuffers([0]));
	});

	it("#aggregate - should use a single worker from the pool", async ({ aggregator, workerPool }) => {
		const getWorker = spy(workerPool, "getWorker");

		await aggregator.aggregate(makeSignatures([0, 1, 2]), roundValidators);

		getWorker.calledOnce();
	});

	it("#aggregate - should reject when the majority is not reached", async ({ aggregator, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		// 2 of 4 is not above 2/3.
		await assert.rejects(
			() => aggregator.aggregate(makeSignatures([0, 1]), roundValidators),
			"Failed to aggregate signatures, because the majority is not reached.",
		);

		consensusSignature.neverCalled();
	});

	it("#aggregate - should reject an empty set of signatures", async ({ aggregator, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		await assert.rejects(
			() => aggregator.aggregate(new Map(), roundValidators),
			"Failed to aggregate signatures, because the majority is not reached.",
		);

		consensusSignature.neverCalled();
	});

	it("#aggregate - should reject a validator index outside the round", async ({ aggregator, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		// Majority is reached (4 signatures), but index 4 does not exist in a round of 4.
		await assert.rejects(
			() => aggregator.aggregate(makeSignatures([0, 1, 2, 4]), roundValidators),
			"Failed to aggregate signatures, because validator index 4 is out of range.",
		);

		consensusSignature.neverCalled();
	});

	it("#aggregate - should reject a negative validator index", async ({ aggregator, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		await assert.rejects(
			() => aggregator.aggregate(makeSignatures([-1, 0, 1, 2]), roundValidators),
			"Failed to aggregate signatures, because validator index -1 is out of range.",
		);

		consensusSignature.neverCalled();
	});

	it("#aggregate - should reject a non-integer validator index", async ({ aggregator, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		await assert.rejects(
			() => aggregator.aggregate(makeSignatures([0, 1, 2.5]), roundValidators),
			"Failed to aggregate signatures, because validator index 2.5 is out of range.",
		);

		consensusSignature.neverCalled();
	});

	it("#aggregate - should propagate worker errors", async ({ aggregator, worker }) => {
		stub(worker, "consensusSignature").rejectedValue(new Error("worker down"));

		await assert.rejects(() => aggregator.aggregate(makeSignatures([0, 1, 2]), roundValidators), "worker down");
	});

	it("#verify - should verify the signature against the aggregated key of the validators that signed", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const getValidator = spy(validatorSet, "getValidator");
		const publicKeyFactory = stub(worker, "publicKeyFactory").resolvedValue(aggregatedPublicKey);
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(true);
		const data = Buffer.from("message to verify");

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, false, true, true] },
			data,
			roundValidators,
		);

		assert.true(result);

		getValidator.calledTimes(3);
		getValidator.calledWith(0);
		getValidator.calledWith(2);
		getValidator.calledWith(3);
		getValidator.notCalledWith(1);

		publicKeyFactory.calledOnce();
		publicKeyFactory.calledWith("aggregate", publicKeyBuffers([0, 2, 3]));

		consensusSignature.calledOnce();
		consensusSignature.calledWith(
			"verify",
			Buffer.from(aggregatedSignature, "hex"),
			data,
			Buffer.from(aggregatedPublicKey, "hex"),
		);
	});

	it("#verify - should return false when the worker rejects the signature", async ({ aggregator, worker }) => {
		stub(worker, "consensusSignature").resolvedValue(false);

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, true, true] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.false(result);
	});

	it("#verify - should accept exactly the majority threshold", async ({ aggregator, worker }) => {
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(true);

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, true, false] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.true(result);
		consensusSignature.calledOnce();
	});

	it("#verify - should use a single worker for both operations", async ({ aggregator, worker, workerPool }) => {
		stub(worker, "consensusSignature").resolvedValue(true);
		const getWorker = spy(workerPool, "getWorker");

		await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, true, true] },
			Buffer.from("message"),
			roundValidators,
		);

		getWorker.calledOnce();
	});

	it("#verify - should return false when the validator bitmap is shorter than the round", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const getValidator = spy(validatorSet, "getValidator");
		const publicKeyFactory = spy(worker, "publicKeyFactory");
		const consensusSignature = spy(worker, "consensusSignature");

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, true] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.false(result);
		getValidator.neverCalled();
		publicKeyFactory.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#verify - should return false when the validator bitmap is longer than the round", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const getValidator = spy(validatorSet, "getValidator");
		const consensusSignature = spy(worker, "consensusSignature");

		// Index 4 is set; without the length guard getValidator(4) would throw instead of returning false.
		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, true, false, true] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.false(result);
		getValidator.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#verify - should return false when the validators that signed are not a majority", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const getValidator = spy(validatorSet, "getValidator");
		const publicKeyFactory = spy(worker, "publicKeyFactory");
		const consensusSignature = spy(worker, "consensusSignature");

		// 2 of 4 is not above 2/3.
		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true, true, false, false] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.false(result);
		getValidator.calledTimes(2);
		publicKeyFactory.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#verify - should return false when no validator signed", async ({ aggregator, worker }) => {
		const publicKeyFactory = spy(worker, "publicKeyFactory");
		const consensusSignature = spy(worker, "consensusSignature");

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [false, false, false, false] },
			Buffer.from("message"),
			roundValidators,
		);

		assert.false(result);
		publicKeyFactory.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#verify - should propagate worker errors", async ({ aggregator, worker }) => {
		stub(worker, "publicKeyFactory").rejectedValue(new Error("worker down"));

		await assert.rejects(
			() =>
				aggregator.verify(
					{ signature: aggregatedSignature, validators: [true, true, true, true] },
					Buffer.from("message"),
					roundValidators,
				),
			"worker down",
		);
	});

	it("#verify - should propagate signature verification errors", async ({ aggregator, worker }) => {
		stub(worker, "publicKeyFactory").resolvedValue(aggregatedPublicKey);
		stub(worker, "consensusSignature").rejectedValue(new Error("verify failed"));

		await assert.rejects(
			() =>
				aggregator.verify(
					{ signature: aggregatedSignature, validators: [true, true, true, true] },
					Buffer.from("message"),
					roundValidators,
				),
			"verify failed",
		);
	});

	it("#verify - should verify a single signer when the round has one validator", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const publicKeyFactory = stub(worker, "publicKeyFactory").resolvedValue(aggregatedPublicKey);
		const consensusSignature = stub(worker, "consensusSignature").resolvedValue(true);
		const getValidator = spy(validatorSet, "getValidator");

		const result = await aggregator.verify(
			{ signature: aggregatedSignature, validators: [true] },
			Buffer.from("message"),
			1,
		);

		assert.true(result);
		getValidator.calledOnce();
		getValidator.calledWith(0);
		publicKeyFactory.calledWith("aggregate", publicKeyBuffers([0]));
		consensusSignature.calledOnce();
	});

	it("#aggregate + #verify - should verify a proof against exactly the validators that produced it", async ({
		aggregator,
		validatorSet,
		worker,
	}) => {
		const consensusSignature = stub(worker, "consensusSignature");
		consensusSignature.resolvedValueNth(0, aggregatedSignature);
		consensusSignature.resolvedValueNth(1, true);
		const publicKeyFactory = stub(worker, "publicKeyFactory").resolvedValue(aggregatedPublicKey);
		const getValidator = spy(validatorSet, "getValidator");
		const data = Buffer.from("message");

		const proof = await aggregator.aggregate(makeSignatures([1, 2, 3]), roundValidators);
		const result = await aggregator.verify(proof, data, roundValidators);

		assert.true(result);
		getValidator.calledTimes(3);
		getValidator.notCalledWith(0);
		publicKeyFactory.calledWith("aggregate", publicKeyBuffers([1, 2, 3]));
		consensusSignature.calledNthWith(
			1,
			"verify",
			Buffer.from(aggregatedSignature, "hex"),
			data,
			Buffer.from(aggregatedPublicKey, "hex"),
		);
	});
});
