import { Contracts } from "@mainsail/contracts";
import { BigNumber, isBoolean, isObject, isString } from "@mainsail/utils";

import { BigNumberAttribute } from "./big-number-attribute";
import { GenericAttribute } from "./generic-attribute";
import { ObjectAttribute } from "./object-attribute";

const isBigNumber = (value: any): value is BigNumber => value instanceof BigNumber;

export const factory = <T>(attributeType: Contracts.State.AttributeType, value: T): Contracts.State.IAttribute<T> => {
	if (attributeType === Contracts.State.AttributeType.Object) {
		if (isObject(value)) {
			return new ObjectAttribute(value) as unknown as Contracts.State.IAttribute<T>;
		}
		throw new Error(`Attribute value is not an object.`);
	}

	if (attributeType === Contracts.State.AttributeType.BigNumber) {
		if (isBigNumber(value)) {
			return new BigNumberAttribute(value) as unknown as Contracts.State.IAttribute<T>;
		}
		throw new Error(`Attribute value is not a BigNumber.`);
	}

	if (attributeType === Contracts.State.AttributeType.Boolean) {
		if (isBoolean(value)) {
			return new GenericAttribute(value);
		}

		throw new Error(`Attribute value is not a boolean.`);
	}

	if (attributeType === Contracts.State.AttributeType.String) {
		if (isString(value)) {
			return new GenericAttribute(value);
		}

		throw new Error(`Attribute value is not a boolean.`);
	}

	if (attributeType === Contracts.State.AttributeType.Number) {
		if (isString(value)) {
			return new GenericAttribute(value);
		}

		throw new Error(`Attribute value is not a number.`);
	}

	throw new Error(`Attribute type [${attributeType}] is not supported.`);
};
