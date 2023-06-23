import Hapi from "@hapi/hapi";

import { ConsensusController } from "../controllers/consensus";

export const register = (server: Hapi.Server): void => {
    const controller = server.app.app.resolve(ConsensusController);
    server.bind(controller);

    server.route({
        handler: (request: Hapi.Request) => controller.state(request),
        method: "GET",
        path: "/consensus/state",
    });
};
