import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { schemas as cryptoBlockSchemas } from "@mainsail/crypto-block/distribution/index.js";
import {  ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { schemas as cryptoTransactionSchemas } from "@mainsail/crypto-transaction";
import { makeKeywords as makeCryptoValidationKeywords } from "@mainsail/crypto-validation";
import type { Application } from "@mainsail/kernel";
import type { Validator } from "@mainsail/validation";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };

type Context = {
	app: Application;
	validator: Validator;
};

export const prepareValidatorContext = async (context: Context) => {
	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);

	await context.app.resolve(ValidationServiceProvider).register();
	await context.app.resolve(CryptoConfigServiceProvider).register();

	const configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	configuration.setHeight(1);

	const validator = context.app.get<Validator>(Identifiers.Cryptography.Validator);
	for (const keyword of Object.values(makeCryptoValidationKeywords(configuration))) {
		validator.addKeyword(keyword);
	}

	validator.addSchema(cryptoBlockSchemas.blockHash);
	validator.addSchema(cryptoTransactionSchemas.transactionHash);
};
