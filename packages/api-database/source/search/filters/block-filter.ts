import { Criteria, Expressions } from "..";
import { Block } from "../../models/block";
import { handleOrCriteria, optimizeExpression, handleAndCriteria, handleNumericCriteria } from "../search";

export class BlockFilter {
    public async getExpression(
        ...criteria: Criteria.OrBlockCriteria[]
    ): Promise<Expressions.Expression<Block>> {
        const expressions = await Promise.all(
            criteria.map((c) => handleOrCriteria(c, (c) => this.handleBlockCriteria(c))),
        );

        return optimizeExpression({ op: "and", expressions });
    }

    private async handleBlockCriteria(
        criteria: Criteria.BlockCriteria,
    ): Promise<Expressions.Expression<Block>> {
        return handleAndCriteria(criteria, async (key) => {
            switch (key) {
                case "id":
                    return handleOrCriteria(criteria.id!, async (c) => {
                        return { property: "id", op: "equal", value: c };
                    });
                case "version":
                    return handleOrCriteria(criteria.version!, async (c) => {
                        return { property: "version", op: "equal", value: c };
                    });
                case "timestamp":
                    return handleOrCriteria(criteria.timestamp!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("timestamp", c);
                    });
                case "previousBlock":
                    return handleOrCriteria(criteria.previousBlock!, async (c) => {
                        return { property: "previousBlock", op: "equal", value: c };
                    });
                case "height":
                    return handleOrCriteria(criteria.height!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("height", c);
                    });
                case "numberOfTransactions":
                    return handleOrCriteria(criteria.numberOfTransactions!, async (c) => {
                        return handleNumericCriteria("numberOfTransactions", c);
                    });
                case "totalAmount":
                    return handleOrCriteria(criteria.totalAmount!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("totalAmount", c);
                    });
                case "totalFee":
                    return handleOrCriteria(criteria.totalFee!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("totalFee", c);
                    });
                case "reward":
                    return handleOrCriteria(criteria.reward!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("reward", c);
                    });
                case "payloadLength":
                    return handleOrCriteria(criteria.payloadLength!, async (c) => {
                        return handleNumericCriteria("payloadLength", c);
                    });
                case "payloadHash":
                    return handleOrCriteria(criteria.payloadHash!, async (c) => {
                        return { property: "payloadHash", op: "equal", value: c };
                    });
                case "generatorPublicKey":
                    return handleOrCriteria(criteria.generatorPublicKey!, async (c) => {
                        return { property: "generatorPublicKey", op: "equal", value: c };
                    });
                default:
                    return { op: "true" };
            }
        });
    }
}
