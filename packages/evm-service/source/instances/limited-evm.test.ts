import { Enums } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { sleep } from "@mainsail/utils";
import { setGracefulCleanup } from "tmp";
import { zeroAddress } from "viem";

import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";
import { LimitedEvmInstance } from "./limited-evm";

@injectable()
class SerialEvmInstance extends LimitedEvmInstance {
	protected override readonly concurrency = 1;
}

describe<{
	app: Application;
	unlimitedInstance: Contracts.Evm.Instance;
	serialInstance: Contracts.Evm.Instance;
}>("LimitedEvmInstance", ({ assert, afterAll, afterEach, beforeEach, it }) => {
	afterAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.unlimitedInstance = context.app.resolve(EvmInstance);
		context.serialInstance = context.app.resolve(SerialEvmInstance);
	});

	afterEach(async ({ unlimitedInstance, serialInstance }) => {
		await unlimitedInstance.dispose();
		await serialInstance.dispose();
	});

	const GAS = 500_000_000n;
	const burn = async (evm: Contracts.Evm.Instance): Promise<void> => {
		const { receipt } = await evm.simulate({
			blockContext: {
				commitKey: { blockNumber: 0n, round: 0n },
				gasLimit: GAS,
				timestamp: 0n,
				validatorAddress: zeroAddress,
			},
			// Deploys 'JUMPDEST PUSH1 0 JUMP', a loop until the tx runs out of gas.
			// At 12 gas per iteration 500M gas is ~42M iterations - roughly 200 ms on a current core, even longer
			// on a slow or busy one. it only has to dwarf a `getAccountInfo` (~1 ms) so that a read issued while
			// the burn is running lands well inside it.
			data: Buffer.from("5b600056", "hex"),
			from: zeroAddress,
			gasLimit: GAS,
			gasPrice: 0n,
			nonce: 0n,
			specId: Enums.Evm.SpecId.OSAKA,
			value: 0n,
		});
		assert.equal(receipt.gasUsed, GAS);
	};

	const settleOrder = async (evm: Contracts.Evm.Instance): Promise<string[]> => {
		// warm up cache
		await evm.getAccountInfo(zeroAddress);

		const order: string[] = [];
		const burning = burn(evm).then(() => order.push("burn"));

		// The burn's tokio task acquires its permit within microseconds of being spawned. 50 ms is a wide
		// margin for that while leaving most of the burn ahead of the read.
		await sleep(50);

		const reading = evm.getAccountInfo(zeroAddress).then(() => order.push("read"));
		await Promise.all([burning, reading]);

		return order;
	};

	it("should queue a call behind the one in flight once the limit is reached", async ({ serialInstance }) => {
		assert.equal(await settleOrder(serialInstance), ["burn", "read"]);
	});

	it("should run calls concurrently when no limit is set", async ({ unlimitedInstance }) => {
		assert.equal(await settleOrder(unlimitedInstance), ["read", "burn"]);
	});
});
