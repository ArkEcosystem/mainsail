import { Services } from "@mainsail/kernel";

import { describe } from "../index";
import { getWalletAttributeSet, knownAttributes } from "./wallet-attributes";

describe("WalletAttributes", ({ it, assert }) => {
	it("#getWalletAttributeSet - should return attributes", () => {
		const attributes = getWalletAttributeSet();

		assert.true(attributes.has("validatorRank"));
		assert.true(attributes.has("validatorResigned"));
		assert.true(attributes.has("validatorRound"));
		assert.true(attributes.has("validatorUsername"));
		assert.true(attributes.has("validatorVoteBalance"));
		assert.true(attributes.has("multiSignature"));
		assert.true(attributes.has("vote"));
	});

	it("#knownAttributes - is attribute map", () => {
		assert.instance(knownAttributes, Services.Attributes.AttributeMap);
	});
});
