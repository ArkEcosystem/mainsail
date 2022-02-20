import { ITransactionData } from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Configuration } from "@packages/crypto-config";
import { Ajv } from "ajv";
import ajvKeywords from "ajv-keywords";

// @TODO: remove this
export enum TransactionType {
	Transfer = 0,
	DelegateRegistration = 2,
	Vote = 3,
	MultiSignature = 4,
	MultiPayment = 6,
	DelegateResignation = 7,
}

export const registerKeywords = (configuration: Configuration) => {
	const maxBytes = (ajv: Ajv) => {
		ajv.addKeyword("maxBytes", {
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
		ajv.addKeyword("transactionType", {
			// @ts-ignore
			compile(schema) {
				return (data, dataPath, parentObject: ITransactionData) => {
					// Impose dynamic multipayment limit based on milestone
					if (
						data === TransactionType.MultiPayment &&
						parentObject &&
						(!parentObject.typeGroup || parentObject.typeGroup === 1) &&
						parentObject.asset &&
						parentObject.asset.payments
					) {
						const limit: number = configuration.getMilestone().multiPaymentLimit || 256;
						return parentObject.asset.payments.length <= limit;
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
		ajv.addKeyword("network", {
			compile(schema) {
				return (data) => schema && data === configuration.get("network.pubKeyHash");
			},
			errors: false,
			metaSchema: {
				type: "boolean",
			},
		});
	};

	const bignum = (ajv: Ajv) => {
		const instanceOf = ajvKeywords.get("instanceof").definition;
		instanceOf.CONSTRUCTORS.BigNumber = BigNumber;

		ajv.addKeyword("bignumber", {
			compile(schema) {
				return (data, dataPath, parentObject: any, property) => {
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

					if (parentObject && property) {
						parentObject[property] = bignum;
					}

					const bypassGenesis = false;

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
				additionalItems: false,
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
		ajv.addKeyword("blockId", {
			compile(schema) {
				return (data, dataPath, parentObject: any) => {
					if (
						parentObject &&
						parentObject.height === 1 &&
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

					if (parentObject && parentObject.height) {
						const height = schema.isPreviousBlock ? parentObject.height - 1 : parentObject.height;
						const constants = configuration.getMilestone(height ?? 1); // if height === 0 set it to 1
						return constants.block.idFullSha256 ? isFullSha256 : isPartial;
					}

					return isPartial || isFullSha256;
				};
			},
			errors: false,
			metaSchema: {
				additionalItems: false,
				properties: {
					allowNullWhenGenesis: { type: "boolean" },
					isPreviousBlock: { type: "boolean" },
				},
				type: "object",
			},
		});
	};

	return [bignum, blockId, maxBytes, network, transactionType];
};
