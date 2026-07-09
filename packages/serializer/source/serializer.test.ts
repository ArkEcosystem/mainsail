import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CryptoSignatureBls12381 } from "@mainsail/crypto-signature-bls12-381";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Contracts } from "@mainsail/contracts";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

import { describe } from "@mainsail/test-runner";
import { Serializer } from "./serializer";
import { ByteBuffer } from "@mainsail/utils";
import { NotImplemented } from "@mainsail/exceptions";

describe<{
	app: Application;
	serializer: Serializer;
}>("Serializer", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);

		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		await context.app.resolve<ECDSA>(ECDSA).register();
		await context.app.resolve<CryptoAddressKeccak256>(CryptoAddressKeccak256).register();
		await context.app.resolve<CryptoSignatureEcdsa>(CryptoSignatureEcdsa).register();
		await context.app.resolve<CryptoSignatureBls12381>(CryptoSignatureBls12381).register();
		await context.app.resolve<CryptoHashBcrypto>(CryptoHashBcrypto).register();

		context.serializer = context.app.resolve(Serializer);
	});

	it("should serialize and deserialize every supported schema type", async ({ serializer }) => {
		const schema = {
			uint8Value: { type: "uint8" },
			uint16Value: { type: "uint16" },
			uint32Value: { type: "uint32" },
			uint48Value: { type: "uint48" },
			uint64Value: { type: "uint64" },
			uint256Value: { type: "uint256" },
			bigintValue: { type: "bigint" },

			hashValue: { type: "hash" },
			shortHashValue: { type: "hash", size: 4 },

			blockHashValue: { type: "blockHash", optional: true },
			missingBlockHashValue: { type: "blockHash", optional: true },

			addressValue: { type: "address" },
			publicKeyValue: { type: "publicKey" },
			consensusSignatureValue: { type: "consensusSignature" },

			validatorSetValue: { type: "validatorSet" },
			hexValue: { type: "hex" },

			transactionsCount: { type: "uint8" },
			transactions: { type: "transactions" },
		} as const;

		const publicKey = "03335579fc9eab385e3076e31a2bae5f7560e4697abe6d476c93d07ffae628a359";
		const consensusSignature =
			"9529fb1b3001aa735a2d3a70ac8568c9e5757c7112d43de6a0463b3d4354b54a706dc3ab9ca49d32f2307059fe93c5b017949f54427e257af38f72cff36b041ce30fb5ebbac636b2f84ced80a16e0150b059771dae40a5baf86f5805baf061b0";

		const data = {
			uint8Value: 1,
			uint16Value: 0x0203,
			uint32Value: 0x04050607,
			uint48Value: 0x010203040506,
			uint64Value: 123_456_789n,
			uint256Value: 12345678901234567890n,
			bigintValue: 987654321n,

			hashValue: "11".repeat(32),
			shortHashValue: "22".repeat(4),

			blockHashValue: "33".repeat(32),
			missingBlockHashValue: undefined,

			addressValue: "0x18F8a91Aa88af45329fb1650BCdD53aAC1Ff4bfe",
			publicKeyValue: publicKey,
			consensusSignatureValue: consensusSignature,

			validatorSetValue: [true, false, true, true, false, false, true, false, true],
			hexValue: "deadbeefcafebabe",

			transactionsCount: 2,
			transactions: [{ serialized: Buffer.from("aa", "hex") }, { serialized: Buffer.from("bbcc", "hex") }],
		};

		const serialized = await serializer.serialize(data, {
			length: 512,
			schema,
			skip: 0,
		});

		const deserialized = await serializer.deserialize<typeof data>(
			ByteBuffer.fromBuffer(serialized),
			{},
			{ schema },
		);

		assert.equal(deserialized.uint8Value, data.uint8Value);
		assert.equal(deserialized.uint16Value, data.uint16Value);
		assert.equal(deserialized.uint32Value, data.uint32Value);
		assert.equal(deserialized.uint48Value, data.uint48Value);
		assert.equal(deserialized.uint64Value, data.uint64Value);

		assert.equal(deserialized.uint256Value.toString(), data.uint256Value.toString());
		assert.equal(deserialized.bigintValue.toString(), data.bigintValue.toString());

		assert.equal(deserialized.hashValue, data.hashValue);
		assert.equal(deserialized.shortHashValue, data.shortHashValue);

		assert.equal(deserialized.blockHashValue, data.blockHashValue);
		assert.equal(deserialized.missingBlockHashValue, undefined);

		assert.equal(deserialized.addressValue, data.addressValue);
		assert.equal(deserialized.publicKeyValue, data.publicKeyValue);
		assert.equal(deserialized.consensusSignatureValue, data.consensusSignatureValue);

		assert.equal(deserialized.validatorSetValue, data.validatorSetValue);
		assert.equal(deserialized.hexValue, data.hexValue);

		assert.equal(deserialized.transactionsCount, 2);
		assert.equal(deserialized.transactions, [Buffer.from("aa", "hex"), Buffer.from("bbcc", "hex")]);
	});

	it("should skip bytes", async ({ serializer }) => {
		const serialized = await serializer.serialize(
			{ value: 0xaa },
			{
				length: 3,
				skip: 2,
				schema: {
					value: { type: "uint8" },
				},
			},
		);

		assert.equal(serialized, Buffer.from([0x00, 0x00, 0xaa]));
	});

	it("throws when serializing an unsupported schema type", async ({ serializer }) => {
		try {
			await serializer.serialize({ value: 1 }, {
				length: 1,
				schema: {
					value: { type: "unsupported" },
				},
			} as any);

			assert.true(false);
		} catch (ex) {
			assert.equal(ex, new NotImplemented("Serializer", "unsupported"));
		}
	});

	it("throws when deserializing an unsupported schema type", async ({ serializer }) => {
		try {
			await serializer.deserialize(ByteBuffer.fromBuffer(Buffer.alloc(0)), {}, {
				schema: {
					value: { type: "unsupported" },
				},
			} as any);

			assert.true(false);
		} catch (ex) {
			assert.equal(ex, new NotImplemented("Serializer", "unsupported"));
		}
	});
});
