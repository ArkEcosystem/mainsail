import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { BigNumberAttribute } from "./big-number-attribute";
import { GenericAttribute } from "./generic-attribute";
import { ObjectAttribute } from "./object-attribute";

const isObject = (value: any): value is object => typeof value === "object";

const isBigNumber = (value: any): value is BigNumber => value instanceof BigNumber;

export const factory = <T>(attributeType: string, value: T): Contracts.State.IAttribute<T> => {
	if (attributeType === "object" && isObject(value)) {
		return new ObjectAttribute(value) as unknown as Contracts.State.IAttribute<T>;
	}

	if (attributeType === "big-number" && isBigNumber(value)) {
		return new BigNumberAttribute(value) as unknown as Contracts.State.IAttribute<T>;
	}

	return new GenericAttribute(value);
};
