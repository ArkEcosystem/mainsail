import type { BigNumberType } from "@mainsail/utils";

export type ConditionPrimitive = string | number | boolean;
export type ConditionBigNumberish = Exclude<BigNumberType, bigint>;
export type ConditionRange = { min: ConditionBigNumberish; max: ConditionBigNumberish };

export interface Webhook {
	id?: string;
	token?: string;

	event: string;
	target: string;
	enabled: boolean;
	conditions: Array<{
		key: string;
		value: ConditionPrimitive | ConditionBigNumberish | ConditionRange;
		condition: string;
	}>;
}

export interface Database {
	boot(): void;
	restore(): void;
	all(): Webhook[];
	hasById(id: string): boolean;
	findById(id: string): Webhook | undefined;
	findByEvent(event: string): Webhook[];
	create(data: Webhook): Webhook;
	update(id: string, data: Webhook): Webhook | undefined;
	destroy(id: string): Webhook | undefined;
}
