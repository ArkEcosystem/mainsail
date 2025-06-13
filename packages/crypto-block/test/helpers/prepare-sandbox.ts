import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionEvmCall } from "@mainsail/crypto-transaction-evm-call";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };
import { Sandbox } from "../../../test-framework/source/index.js";
import { Deserializer } from "../../source/deserializer.js";
import { BlockFactory } from "../../source/factory.js";
import { HashFactory } from "../../source/hash.factory.js";
import { Serializer } from "../../source/serializer.js";
// import { prepareBlock } from "./prepare-block.js";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.bind(Identifiers.Cryptography.Block.HeaderSize).toConstantValue(() => {
		const hashByteLength = context.sandbox.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);
		const generatorAddressByteLength = context.sandbox.app.get<number>(
			Identifiers.Cryptography.Identity.Address.Size,
		);

		return (
			1 + // version
			6 + // timestamp
			4 + // height
			4 + // round
			hashByteLength + // previousBlock
			hashByteLength + // stateRoot
			256 + // logsBloom
			2 + // numberOfTransactions
			4 + // totalGasUsed
			32 + // totalAmount
			32 + // totalFee
			32 + // reward
			4 + // payloadLength
			hashByteLength + // payloadHash
			generatorAddressByteLength
		);
	});

	context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => {} });
	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoConsensus).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoAddressBase58).register();
	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoTransactionEvmCall).register();
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.HashFactory).to(HashFactory);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory);

	// await prepareBlock(context);
};
