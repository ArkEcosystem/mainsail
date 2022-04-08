import { Services } from "@arkecosystem/core-kernel";

import { describe } from "../index";
import { getWalletAttributeSet, knownAttributes } from "./wallet-attributes";

describe("WalletAttributes", ({ it, assert }) => {
	it("#getWalletAttributeSet - should return attributes", () => {
		const attributes = getWalletAttributeSet();

		assert.true(attributes.has("validator.rank"));
		assert.true(attributes.has("validator.resigned"));
		assert.true(attributes.has("validator.round"));
		assert.true(attributes.has("validator.username"));
		assert.true(attributes.has("validator.voteBalance"));
		assert.true(attributes.has("validator"));
		assert.true(attributes.has("multiSignature"));
		assert.true(attributes.has("vote"));
	});

	it("#knownAttributes - is attribute map", () => {
		assert.instance(knownAttributes, Services.Attributes.AttributeMap);
	});
});
