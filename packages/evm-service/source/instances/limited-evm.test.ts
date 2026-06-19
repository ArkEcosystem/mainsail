import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";
import { LimitedEvmInstance } from "./limited-evm";

describe<{
	app: Application;
	unlimitedInstance: Contracts.Evm.Instance & Contracts.Evm.Storage;
	limitedInstance: Contracts.Evm.Instance & Contracts.Evm.Storage;
}>("LimitedEvmInstance", ({ assert, afterAll, afterEach, beforeEach, it }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async ({ unlimitedInstance, limitedInstance }) => {
		await unlimitedInstance.dispose();
		await limitedInstance.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.unlimitedInstance = context.app.resolve(EvmInstance);
		context.limitedInstance = context.app.resolve(LimitedEvmInstance);
	});

	const address = "0x0000000000000000000000000000000000000001";

	// Fire `n` gated reads at once and return how long they took to all settle.
	const hammer = async (evm: Contracts.Evm.Instance, n: number): Promise<number> => {
		await evm.getAccountInfo(address); // warm up (one-time init cost out of the measurement)
		const start = performance.now();
		await Promise.all(Array.from({ length: n }, () => evm.getAccountInfo(address)));
		return performance.now() - start;
	};

	it("serializes gated calls under a small limit and parallelizes without one", async ({
		unlimitedInstance,
		limitedInstance,
	}) => {
		const N = 500;

		// limited → the semaphore admits less than N reads at the same time, so N reads take longer.
		const limited = await hammer(limitedInstance, N);
		// unlimited → N reads fan out across the blocking pool (512 threads) and overlap, so N reads take less.
		const unlimited = await hammer(unlimitedInstance, N);

		console.log({ limited, unlimited });
		// { limited: 9.473764999999958, unlimited: 2.2855690000000095 }

		// The limited batch takes longer than the unbounded one. That gap is the proof
		// the semaphore is actually enforcing the cap
		assert.true(limited > unlimited * 1.05);
	});
});
