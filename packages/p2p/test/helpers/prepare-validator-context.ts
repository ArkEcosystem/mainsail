import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/mainsail/crypto.json";
import { schemas as cryptoBlockSchemas } from "../../../crypto-block/distribution";
import { Configuration } from "../../../crypto-config/distribution";
import { makeKeywords as makeMessageKeywords } from "../../../crypto-messages/distribution/keywords";
import { schemas as cryptoTransactionSchemas } from "../../../crypto-transaction/distribution";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation/distribution";
import { Sandbox } from "../../../test-framework/distribution";
import { makeKeywords } from "../../source/validation/keywords";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

export const prepareValidatorContext = (context: Context) => {
	context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

	const keywords = makeKeywords();
	context.validator.addKeyword(keywords.buffer);

	const configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
	const messageKeywords = makeMessageKeywords(configuration);
	context.validator.addKeyword(messageKeywords.limitToActiveValidators);
	context.validator.addKeyword(messageKeywords.isValidatorIndex);

	context.validator.addSchema(cryptoValidationSchemas.hex);
	context.validator.addSchema(cryptoBlockSchemas.blockId);
	context.validator.addSchema(cryptoTransactionSchemas.transactionId);
};
