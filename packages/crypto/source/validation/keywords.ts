import Ajv from "ajv";
import { TransactionType } from "../enums";
import { configManager } from "../managers";
import { BigNumber, isGenesisTransaction } from "../utils";

const maxBytes = (ajv: Ajv) => {
	ajv.addKeyword({
		keyword: "maxBytes",
		compile(schema, parentSchema) {
			return (data) => {
				if ((parentSchema as any).type !== "string") {
					return false;
				}

				return Buffer.from(data, "utf8").byteLength <= schema;
			};
		},
		errors: false,
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
		type: "string",
	});
};

const transactionType = (ajv: Ajv) => {
	ajv.addKeyword({
		keyword: "transactionType",
		// @ts-ignore
		compile(schema) {
			return (data, context) => {
				// Impose dynamic multipayment limit based on milestone
				if (
					data === TransactionType.MultiPayment &&
					context.parentData &&
					(!context.parentData.typeGroup || context.parentData.typeGroup === 1) &&
					context.parentData.asset &&
					context.parentData.asset.payments
				) {
					const limit: number = configManager.getMilestone().multiPaymentLimit || 256;
					return context.parentData.asset.payments.length <= limit;
				}

				return data === schema;
			};
		},
		errors: false,
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
	});
};

const network = (ajv: Ajv) => {
	ajv.addKeyword({
		keyword: "network",
		compile(schema) {
			return (data) => schema && data === configManager.get("network.pubKeyHash");
		},
		errors: false,
		metaSchema: {
			type: "boolean",
		},
	});
};

const bignumber = (ajv: Ajv) => {
	const instanceOf = require("ajv-keywords/dist/definitions/instanceof");
	instanceOf.CONSTRUCTORS.BigNumber = BigNumber;

	ajv.addKeyword({
		keyword: "bignumber",
		compile(schema) {
			return (data, context) => {
				const minimum = typeof schema.minimum !== "undefined" ? schema.minimum : 0;
				const maximum = typeof schema.maximum !== "undefined" ? schema.maximum : "9223372036854775807"; // 8 byte maximum

				if (data !== 0 && !data) {
					return false;
				}

				let bignum: BigNumber;
				try {
					bignum = BigNumber.make(data);
				} catch {
					return false;
				}

				if (context.parentData && context.parentDataProperty) {
					context.parentData[context.parentDataProperty] = bignum;
				}

				let bypassGenesis = false;
				if (schema.bypassGenesis && context.parentData.id) {
					if (schema.block) {
						bypassGenesis = context.parentData.height === 1;
					} else {
						bypassGenesis = isGenesisTransaction(context.parentData.id);
					}
				}

				if (bignum.isLessThan(minimum) && !(bignum.isZero() && bypassGenesis)) {
					return false;
				}

				if (bignum.isGreaterThan(maximum) && !bypassGenesis) {
					return false;
				}

				return true;
			};
		},
		errors: false,
		metaSchema: {
			properties: {
				block: { type: "boolean" },
				bypassGenesis: { type: "boolean" },
				maximum: { type: "integer" },
				minimum: { type: "integer" },
			},
			type: "object",
		},
		modifying: true,
	});
};

const blockId = (ajv: Ajv) => {
	ajv.addKeyword({
		keyword: "blockId",
		compile(schema) {
			return (data, context) => {
				if (
					context.parentData &&
					context.parentData.height === 1 &&
					schema.allowNullWhenGenesis &&
					(!data || Number(data) === 0)
				) {
					return true;
				}

				if (typeof data !== "string") {
					return false;
				}

				// Partial SHA256 block id (old/legacy), before the switch to full SHA256.
				// 8 byte integer either decimal without leading zeros or hex with leading zeros.
				const isPartial = /^\d{1,20}$/.test(data) || /^[\da-f]{16}$/i.test(data);
				const isFullSha256 = /^[\da-f]{64}$/i.test(data);

				if (context.parentData && context.parentData.height) {
					const height = schema.isPreviousBlock ? context.parentData.height - 1 : context.parentData.height;
					const constants = configManager.getMilestone(height ?? 1); // if height === 0 set it to 1
					return constants.block.idFullSha256 ? isFullSha256 : isPartial;
				}

				return isPartial || isFullSha256;
			};
		},
		errors: false,
		metaSchema: {
			properties: {
				allowNullWhenGenesis: { type: "boolean" },
				isPreviousBlock: { type: "boolean" },
			},
			type: "object",
		},
	});
};

export const keywords = [bignumber, blockId, maxBytes, network, transactionType];
