import { Contracts } from "@mainsail/contracts";

import { BigNumberAttribute } from "./big-number-attribute.js";
import { BooleanAttribute } from "./boolean-attribute.js";
import { NumberAttribute } from "./number-attribute.js";
import { ObjectAttribute } from "./object-attribute.js";
import { StringAttribute } from "./string-attribute.js";

const factories: Record<Contracts.State.AttributeType, new (value?: any) => Contracts.State.Attribute<any>> = {
	[Contracts.State.AttributeType.Object]: ObjectAttribute,
	[Contracts.State.AttributeType.BigNumber]: BigNumberAttribute,
	[Contracts.State.AttributeType.Boolean]: BooleanAttribute,
	[Contracts.State.AttributeType.String]: StringAttribute,
	[Contracts.State.AttributeType.Number]: NumberAttribute,
};

export const factory = <T>(
	attributeType: Contracts.State.AttributeType,
	value: unknown,
): Contracts.State.Attribute<T> => {
	if (!factories[attributeType]) {
		throw new Error(`Attribute type [${attributeType}] is not supported.`);
	}

	return new factories[attributeType](value) as Contracts.State.Attribute<T>;
};

export const jsonFactory = <T>(
	attributeType: Contracts.State.AttributeType,
	value: Contracts.Types.JsonValue,
): Contracts.State.Attribute<T> => {
	if (!factories[attributeType]) {
		throw new Error(`Attribute type [${attributeType}] is not supported.`);
	}

	return (new factories[attributeType]() as Contracts.State.Attribute<T>).fromJson(value);
};
