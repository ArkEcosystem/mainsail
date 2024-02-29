import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import Joi from "joi";

import { getRcpId } from "./utils";

@injectable()
export class Processor implements Contracts.Api.RPC.Processor {
	@inject(Identifiers.Services.Validation.Service)
	private readonly validator!: Contracts.Kernel.Validator;

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
			id: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.allow(null)).required(),
			jsonrpc: Joi.string().valid("2.0").required(),
			method: Joi.string().required(),
			params: Joi.any(),
		});

		const payload = request.payload as Contracts.Types.JsonObject;

		this.validator.validate(payload, schema);

		console.log("PASSES:", this.validator.passes(), this.validator.errors());

		return this.validator.passes();
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
}
