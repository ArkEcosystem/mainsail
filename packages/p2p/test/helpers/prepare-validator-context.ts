import { Identifiers } from "@mainsail/constants";
import { schemas as cryptoBlockSchemas } from "@mainsail/crypto-block/distribution/index.js";
import { Configuration } from "@mainsail/crypto-config/distribution/index.js";
import { makeKeywords as makeProposalKeywords } from "@mainsail/crypto-proposal/distribution/keywords.js";
import { schemas as cryptoTransactionSchemas } from "@mainsail/crypto-transaction/distribution/index.js";
import { schemas as cryptoValidationSchemas } from "@mainsail/crypto-validation/distribution/index.js";
import type { Application } from "@mainsail/kernel";
import type { Validator } from "@mainsail/validation";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };
import { makeKeywords } from "../../source/validation/keywords.js";

type Context = {
	app: Application;
	validator: Validator;
};

export const prepareValidatorContext = (context: Context) => {
	context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
	context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

	const keywords = makeKeywords();
	context.validator.addKeyword(keywords.buffer);

	const configuration = context.app.get<Configuration>(Identifiers.Cryptography.Configuration);
	const messageKeywords = makeProposalKeywords(configuration);
	context.validator.addKeyword(messageKeywords.limitToRoundValidators);
	context.validator.addKeyword(messageKeywords.isValidatorIndex);

	context.validator.addSchema(cryptoValidationSchemas.hex);
	context.validator.addSchema(cryptoBlockSchemas.blockHash);
	context.validator.addSchema(cryptoTransactionSchemas.transactionHash);
};
