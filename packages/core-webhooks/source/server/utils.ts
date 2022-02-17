import { Boom, notFound } from "@hapi/boom";

import { Webhook } from "../interfaces";

export const transformResource = (model): Webhook => ({
	conditions: model.conditions,
	enabled: model.enabled,
	event: model.event,
	id: model.id,
	target: model.target,
	token: model.token,
});

export const respondWithResource = (data): { data: Webhook } | Boom<Webhook> =>
	data ? { data: transformResource(data) } : notFound();
