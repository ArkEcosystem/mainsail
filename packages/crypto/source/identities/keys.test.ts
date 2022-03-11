import wif from "wif";
import { Errors } from "@arkecosystem/crypto-identities";
import { describe } from "@arkecosystem/core-test-framework";
import { Address } from "./address";
import { Keys } from "./keys";
import { data, passphrase } from "../../test/identities/fixture.json";

describe("Identities - Keys", ({ it, assert, stubFn }) => {
	it("fromPassphrase - should return two keys in hex", () => {
		const keys = Keys.fromPassphrase("secret");

		assert.object(keys);
		assert.match(keys.publicKey, keys.publicKey);
		assert.match(keys.privateKey, keys.privateKey);
	});

	it("fromPassphrase - should return address", () => {
		const keys = Keys.fromPassphrase(passphrase);
		// @ts-ignore
		const address = Address.fromPublicKey(keys.publicKey.toString("hex"));
		assert.equal(address, data.address);
	});

	it("fromPrivateKey - should return two keys in hex", () => {
		const keys = Keys.fromPrivateKey(data.privateKey);

		assert.object(keys);
		assert.match(keys.publicKey, data.publicKey);
		assert.match(keys.privateKey, data.privateKey);
	});

	it("fromWIF - should return two keys in hex", () => {
		const keys = Keys.fromWIF("SGq4xLgZKCGxs7bjmwnBrWcT4C1ADFEermj846KC97FSv1WFD1dA");

		assert.object(keys);
		assert.match(keys.publicKey, data.publicKey);
		assert.match(keys.privateKey, data.privateKey);
	});

	it("fromWIF - should return address", () => {
		const keys = Keys.fromWIF(data.wif);
		// @ts-ignore
		const address = Address.fromPublicKey(keys.publicKey.toString("hex"));
		assert.equal(address, data.address);
	});

	it("fromWIF - should get keys from compressed WIF", () => {
		const keys = Keys.fromWIF("SAaaKsDdWMXP5BoVnSBLwTLn48n96UvG42WSUUooRv1HrEHmaSd4");

		assert.object(keys);
		assert.true(keys.hasOwnProperty("publicKey"));
		assert.true(keys.hasOwnProperty("privateKey"));
		assert.true(keys.hasOwnProperty("compressed"));
		assert.true(keys.compressed);
	});

	it("fromWIF - should get keys from uncompressed WIF", () => {
		const keys = Keys.fromWIF("6hgnAG19GiMUf75C43XteG2mC8esKTiX9PYbKTh4Gca9MELRWmg");

		assert.object(keys);
		assert.true(keys.hasOwnProperty("publicKey"));
		assert.true(keys.hasOwnProperty("privateKey"));
		assert.true(keys.hasOwnProperty("compressed"));
		assert.false(keys.compressed);
	});

	it("fromWIF - should fail with an invalid network version", () => {
		const previousWIF = wif.decode;

		wif.decode = stubFn().returns({ version: 1 });

		assert.throws(
			() => {
				Keys.fromWIF("invalid");
			},
			(err) => err instanceof Errors.NetworkVersionError,
		);

		wif.decode = previousWIF;
	});
});
