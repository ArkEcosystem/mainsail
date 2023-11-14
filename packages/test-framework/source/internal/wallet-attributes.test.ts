import { describe } from "../index";
import { getAttributeRepository } from "./wallet-attributes";

describe("WalletAttributes", ({ it, assert }) => {
	it("#getAttributeRepository - should return attributes", () => {
		const attributes = getAttributeRepository();

		assert.true(attributes.has("balance"));
		assert.true(attributes.has("nonce"));
		assert.true(attributes.has("publicKey"));
		assert.true(attributes.has("validatorRank"));
		assert.true(attributes.has("validatorResigned"));
		assert.true(attributes.has("validatorPublicKey"));
		assert.true(attributes.has("validatorVoteBalance"));
		assert.true(attributes.has("multiSignature"));
		assert.true(attributes.has("vote"));
	});
});
