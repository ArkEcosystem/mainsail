import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class CallAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_call";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [
			{
				additionalProperties: false,
				properties: {
					data: { type: "string" },
					from: { type: "string" },
					to: { type: "string" },
				},
				required: ["from", "to", "data"],
				type: "object",
			},
			{ enum: ["latest", "earliest", "pending"], type: "string" },
		],

		type: "array",
	};

	public async handle(parameters: any): Promise<any> {
		return `OK ${this.name}`;
	}
}
