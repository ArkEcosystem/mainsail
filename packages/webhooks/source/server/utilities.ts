import type { Boom} from "@hapi/boom";
import { notFound } from "@hapi/boom";
import type { Contracts } from "@mainsail/contracts";

export const transformResource = (model): Contracts.Webhooks.Webhook => ({
	conditions: model.conditions,
	enabled: model.enabled,
	event: model.event,
	id: model.id,
	target: model.target,
	token: model.token,
});

export const respondWithResource = (data): { data: Contracts.Webhooks.Webhook } | Boom<Contracts.Webhooks.Webhook> =>
	data ? { data: transformResource(data) } : notFound();
