import Hapi from "@hapi/hapi";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { getRcpId, prepareRcpError } from "./utils";

@injectable()
export class Processor implements Contracts.Api.RPC.Processor {
	#actions: Map<string, Contracts.Api.RPC.Action> = new Map();

	public registerAction(action: Contracts.Api.RPC.Action): void {
		this.#actions.set(action.name, action);
	}

	async process(request: Hapi.Request): Promise<Contracts.Api.RPC.Response | Contracts.Api.RPC.Error> {
		if (!this.#validatePayload(request)) {
			return prepareRcpError(getRcpId(request), Contracts.Api.RPC.ErrorCode.InvalidRequest);
		}

		const payload = request.payload as Contracts.Api.RPC.Request<any>;
		const action = this.#actions.get(payload.method);
		if (!action) {
			return prepareRcpError(getRcpId(request), Contracts.Api.RPC.ErrorCode.MethodNotFound);
		}

		if (!this.#validateParams(payload.params, action)) {
			return prepareRcpError(getRcpId(request), Contracts.Api.RPC.ErrorCode.InvalidParameters);
		}

		try {
			return {
				id: getRcpId(request),
				jsonrpc: "2.0",
				result: await action.handle(payload.params),
			};
		} catch {
			return prepareRcpError(getRcpId(request), Contracts.Api.RPC.ErrorCode.InternalError);
		}
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

	#validateParams(params: any, action: Contracts.Api.RPC.Action): boolean {
		return this.#validate(action.schema, params);
	}

	#validate(schema: Joi.Schema, data: Contracts.Types.JsonObject): boolean {
		const { error } = schema.validate(data);
		return !error;
	}
}
