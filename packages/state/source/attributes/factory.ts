import { Contracts } from "@mainsail/contracts";

// import { BigNumber } from "@mainsail/utils";
import { BigNumberAttribute } from "./big-number-attribute";
import { BooleanAttribute } from "./boolean-attribute";
import { NumberAttribute } from "./number-attribute";
import { ObjectAttribute } from "./object-attribute";
import { StringAttribute } from "./string-attribute";

// const isBigNumber = (value: any): value is BigNumber => value instanceof BigNumber;

const factories: Record<Contracts.State.AttributeType, new (value: any) => Contracts.State.IAttribute<any>> = {
	[Contracts.State.AttributeType.Object]: ObjectAttribute,
	[Contracts.State.AttributeType.BigNumber]: BigNumberAttribute,
	[Contracts.State.AttributeType.Boolean]: BooleanAttribute,
	[Contracts.State.AttributeType.String]: StringAttribute,
	[Contracts.State.AttributeType.Number]: NumberAttribute,
};

export const factory = <T>(
	attributeType: Contracts.State.AttributeType,
	value: unknown,
): Contracts.State.IAttribute<T> => {
	if (!factories[attributeType]) {
		throw new Error(`Attribute type [${attributeType}] is not supported.`);
	}

	return new factories[attributeType](value) as Contracts.State.IAttribute<T>;
};
