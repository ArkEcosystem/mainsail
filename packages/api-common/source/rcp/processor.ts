import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { getRcpId } from "./utils";

@injectable()
export class Processor implements Contracts.Api.RPC.Processor {
	#actions: Map<string, Contracts.Api.RPC.Action> = new Map();

	public registerAction(action: Contracts.Api.RPC.Action): void {
		this.#actions.set(action.name, action);

		console.log("Registered action:", action.name);
	}

	async process(request: Hapi.Request): Promise<Contracts.Api.RPC.Response | Contracts.Api.RPC.Error> {
		if (!this.#validatePayload(request)) {
			return this.#invalidRequest(getRcpId(request));
		}

		return {
			id: getRcpId(request),
			jsonrpc: "2.0",
			result: "OK",
		};
	}

	#validatePayload(request: Hapi.Request): boolean {
		const schema = Joi.object({
			// eslint-disable-next-line unicorn/no-null
			id: Joi.alternatives(Joi.string().allow(null), Joi.number()).required(),
			jsonrpc: Joi.string().valid("2.0").required(),
			method: Joi.string().required(),
			params: Joi.any(),
		});

		const payload = request.payload as Contracts.Types.JsonObject;

		return this.#validate(schema, payload);
	}

	#invalidRequest(id: Contracts.Api.RPC.Id): Contracts.Api.RPC.Error {
		return {
			error: {
				code: -32_600,
				message: "Invalid Request",
			},
			id,
			jsonrpc: "2.0",
		};
	}

	#validate(schema: Joi.Schema, data: Contracts.Types.JsonObject): boolean {
		const { error } = schema.validate(data);

		if (error) {
			console.log("Validation error:", error.details);
		}

		return !error;
	}
}
