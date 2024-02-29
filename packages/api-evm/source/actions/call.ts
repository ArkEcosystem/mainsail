import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

@injectable()
export class CallAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_call";

	public readonly schema = Joi.array().items(
		Joi.object({
			data: Joi.string().required(),
			from: Joi.string().required(),
			to: Joi.string().required(),
		}),
		Joi.string().required(),
	);

	public async handle(parameters: any): Promise<any> {
		return `OK ${this.name}`;
	}
}
