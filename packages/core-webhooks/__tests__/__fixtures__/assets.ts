import { Webhook } from "@packages/core-webhooks/source/interfaces";

export const dummyWebhook: Webhook = {
	id: "id",
	token: "token",
	event: "event",
	target: "target",
	enabled: true,
	// conditions: [
	//     {
	//         key: "key",
	//         value: "value",
	//         condition: "condition",
	//     },
	// ],
	conditions: [],
};
