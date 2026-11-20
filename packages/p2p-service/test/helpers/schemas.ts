import { makeKeywords } from "@mainsail/crypto-validation";
import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";

import { Codecs } from "../../source/codecs/index.js";
import { Schemas } from "../../source/schemas/index.js";

type Direction = "request" | "response";

// Sends the data through the real codec first: the schemas describe what the codec hands over, and a
// schema that rejected such data would ban honest peers. Returns the validation error, if any.
const validationError = (
	validator: Validator,
	route: RouteName,
	direction: Direction,
	data: Record<string, unknown>,
): string | undefined => {
	const codec = Codecs[route][direction] as {
		deserialize: (payload: Buffer) => unknown;
		serialize: (data: unknown) => Buffer;
	};

	return validator.validate(Schemas[route][direction]!, codec.deserialize(codec.serialize(data))).error;
};

export type RouteName = keyof typeof Schemas;

export const VALIDATORS = 4;

export const bitmap = (length = VALIDATORS): boolean[] => Array.from({ length }, (_, index) => index % 2 === 0);

export const headers = {
	blockNumber: 5,
	proposedBlockHash: "a".repeat(64),
	round: 1,
	step: 2,
	validatorsSignedPrecommit: bitmap(),
	validatorsSignedPrevote: bitmap(),
	version: "0.0.1-rc.9",
};

// The genesis milestone has no validators; they start with the first block. A call without a block
// number answers for the node's own height, which here is the genesis one.
export const configuration = {
	getMilestone: (blockNumber?: number) => ({ roundValidators: blockNumber ? VALIDATORS : 0 }),
};

// The validator the node runs, with the keywords the crypto packages add to it.
export const makeValidator = (): Validator => {
	const validator = new Application().resolve(Validator);

	for (const keyword of Object.values(makeKeywords(configuration as any))) {
		validator.addKeyword(keyword);
	}

	return validator;
};



export const requestError = (
	validator: Validator,
	route: RouteName,
	data: Record<string, unknown>,
): string | undefined => validationError(validator, route, "request", data);

export const responseError = (
	validator: Validator,
	route: RouteName,
	data: Record<string, unknown>,
): string | undefined => validationError(validator, route, "response", data);
