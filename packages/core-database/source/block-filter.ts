import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";

import { Block } from "./models/block";

const { handleAndCriteria, handleOrCriteria, handleNumericCriteria, optimizeExpression } = AppUtils.Search;

@injectable()
export class BlockFilter implements Contracts.Database.BlockFilter {
	public async getExpression(
		...criteria: Contracts.Shared.OrBlockCriteria[]
	): Promise<Contracts.Search.Expression<Block>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleBlockCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private async handleBlockCriteria(
		criteria: Contracts.Shared.BlockCriteria,
	): Promise<Contracts.Search.Expression<Block>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "id":
					return handleOrCriteria(criteria.id, async (c) => ({ op: "equal", property: "id", value: c }));
				case "version":
					return handleOrCriteria(criteria.version, async (c) => ({
						op: "equal",
						property: "version",
						value: c,
					}));
				case "timestamp":
					return handleOrCriteria(criteria.timestamp, async (c) => handleNumericCriteria("timestamp", c));
				case "previousBlock":
					return handleOrCriteria(criteria.previousBlock, async (c) => ({
						op: "equal",
						property: "previousBlock",
						value: c,
					}));
				case "height":
					return handleOrCriteria(criteria.height, async (c) => handleNumericCriteria("height", c));
				case "numberOfTransactions":
					return handleOrCriteria(criteria.numberOfTransactions, async (c) =>
						handleNumericCriteria("numberOfTransactions", c),
					);
				case "totalAmount":
					return handleOrCriteria(criteria.totalAmount, async (c) => handleNumericCriteria("totalAmount", c));
				case "totalFee":
					return handleOrCriteria(criteria.totalFee, async (c) => handleNumericCriteria("totalFee", c));
				case "reward":
					return handleOrCriteria(criteria.reward, async (c) => handleNumericCriteria("reward", c));
				case "payloadLength":
					return handleOrCriteria(criteria.payloadLength, async (c) =>
						handleNumericCriteria("payloadLength", c),
					);
				case "payloadHash":
					return handleOrCriteria(criteria.payloadHash, async (c) => ({
						op: "equal",
						property: "payloadHash",
						value: c,
					}));
				case "generatorPublicKey":
					return handleOrCriteria(criteria.generatorPublicKey, async (c) => ({
						op: "equal",
						property: "generatorPublicKey",
						value: c,
					}));
				case "blockSignature":
					return handleOrCriteria(criteria.blockSignature, async (c) => ({
						op: "equal",
						property: "blockSignature",
						value: c,
					}));
				default:
					return { op: "true" };
			}
		});
	}
}
