import { Contracts } from "@arkecosystem/core-contracts";
import { FastifyInstance, FastifyRequest } from "fastify";

import { Handlers } from "../contracts";
import { SubmitTransactionHandler } from "./submit";

// @TODO: tidy up
export const registerHandlers = (app: Contracts.Kernel.Application, server: FastifyInstance): void => {
	server.post(
		"/",
		{
			schema: {
				body: {
					properties: {
						//
					},
					type: "object",
				},
			},
		},
		async (request: FastifyRequest) => app.get<SubmitTransactionHandler>(Handlers.Store).invoke(request),
	);
};
