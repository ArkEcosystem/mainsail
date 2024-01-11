import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { CommitsController } from "../controllers/commits";

export const register = (server: Contracts.Api.ApiServer): void => {
    const controller = server.app.app.resolve(CommitsController);
    server.bind(controller);

    server.route({
        handler: (request: Hapi.Request) => controller.show(request),
        method: "GET",
        options: {
            validate: {
                params: Joi.object({
                    id: server.app.schemas.blockId,
                }),
            },
        },
        path: "/commits/{id}",
    });
};
