import Boom from "@hapi/boom";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetMessagesRoute,
	GetPeersRoute,
	GetProposalRoute,
	GetStatusRoute,
	PostBlockRoute,
	PostPrecommitRoute,
	PostPrevoteRoute,
	PostProposalRoute,
	PostTransactionsRoute,
} from "../routes";

@injectable()
export class CodecPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public register(server) {
		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetMessagesRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStatusRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostBlockRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrecommitRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrevoteRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
		};

		server.ext({
			async method(request, h) {
				try {
					request.payload = allRoutesConfigByPath[request.path].codec.request.deserialize(request.payload);
				} catch (error) {
					return Boom.badRequest(`Payload deserializing failed: ${error}`);
				}
				return h.continue;
			},
			type: "onPostAuth",
		});

		server.ext({
			method: async (request, h) => {
				try {
					if (typeof request.response.source !== "undefined") {
						request.response.source = allRoutesConfigByPath[request.path].codec.response.serialize(
							request.response.source,
						);
					} else {
						// if we're here it's because there was some error thrown, error description is in request.response.output.payload
						// as response payload needs to be Buffer, we convert error message to Buffer
						const errorMessage =
							request.response.output?.payload?.message ??
							request.response.output?.payload?.error ??
							"Error";
						request.response.output.payload = Buffer.from(errorMessage, "utf-8");
					}
				} catch (error) {
					request.response.statusCode = 500; // Internal server error (serializing failed)
					request.response.output = {
						headers: {},
						payload: Buffer.from("Internal server error"),
						statusCode: 500,
					};

					this.logger.error(`Response serializing failed: ${error}`);
				}
				return h.continue;
			},
			type: "onPreResponse",
		});
	}
}
