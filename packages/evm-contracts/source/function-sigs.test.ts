import { describe } from "@mainsail/test-runner";
import { type AbiFunction, toFunctionSelector } from "viem";

import ConsensusAbi from "./abis/ConsensusV1.json" with { type: "json" };
import { FunctionSigs } from "./function-sigs";

describe("FunctionSigs", ({ assert, it }) => {
	it("ConsensusV1 - should match the selectors derived from the embedded ABI", () => {
		const derived = Object.fromEntries(
			Object.keys(FunctionSigs.ConsensusV1).map((name) => {
				const functionName = name.charAt(0).toLowerCase() + name.slice(1);

				const abiItems = ConsensusAbi.abi.filter(
					(item) => item.type === "function" && item.name === functionName,
				);

				assert.length(abiItems, 1);

				return [name, toFunctionSelector(abiItems[0] as AbiFunction)];
			}),
		);

		assert.equal({ ...FunctionSigs.ConsensusV1 }, derived);
	});
});
