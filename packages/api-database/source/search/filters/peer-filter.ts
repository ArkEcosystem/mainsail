import { Peer } from "../../models/peer";
import { OrPeerCriteria, PeerCriteria } from "../criteria";
import { Expression } from "../expressions";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search";

export class PeerFilter {
	public static async getExpression(...criteria: OrPeerCriteria[]): Promise<Expression<Peer>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handlePeerCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handlePeerCriteria(criteria: PeerCriteria): Promise<Expression<Peer>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "ip": {
					return handleOrCriteria(criteria.ip, async (c) => ({ op: "equal", property: "ip", value: c }));
				}
				case "version": {
					return handleOrCriteria(criteria.version, async (c) =>
						// @ts-ignore
						handleNumericCriteria("version", c),
					);
				}
				default: {
					return { op: "true" };
				}
			}
		});
	}
}
