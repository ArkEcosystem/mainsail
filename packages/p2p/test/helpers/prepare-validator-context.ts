import { Identifiers } from "@mainsail/constants";
import { schemas as cryptoBlockSchemas } from "@mainsail/crypto-block/distribution/index.js";
import { Configuration } from "@mainsail/crypto-config";
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
	await context.app.resolve(ValidationServiceProvider).register();

	context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
	context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

	const configuration = context.app.get<Configuration>(Identifiers.Cryptography.Configuration);

	const validator = context.app.get<Validator>(Identifiers.Cryptography.Validator);
	for (const keyword of Object.values(makeCryptoValidationKeywords(configuration))) {
		validator.addKeyword(keyword);
	}

	validator.addSchema(cryptoBlockSchemas.blockHash);
	validator.addSchema(cryptoTransactionSchemas.transactionHash);
};
