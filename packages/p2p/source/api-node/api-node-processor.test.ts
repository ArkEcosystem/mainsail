import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dayjs from "dayjs";

import { ApiNodeProcessor } from "./api-node-processor";

describe<{
	processor: ApiNodeProcessor;
	repository: any;
	apiNodeVerifier: any;
	events: any;
}>("ApiNodeProcessor", ({ it, beforeEach, spy }) => {
	const apiNode = { url: "http://1.2.3.4:4003/" } as any;

	beforeEach((context) => {
		context.repository = {
			forgetApiNode: () => {},
			forgetPendingApiNode: () => {},
			hasApiNode: () => true,
			hasPendingApiNode: () => false,
			setApiNode: () => {},
			setPendingApiNode: () => {},
		};
		context.apiNodeVerifier = { verify: async () => true };
		context.events = { dispatch: async () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.ApiNode.Verifier).toConstantValue(context.apiNodeVerifier);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.P2P.Logger).toConstantValue({ debugExtra: () => {} });

		context.processor = app.resolve(ApiNodeProcessor);

		delete apiNode.lastPinged;
	});

	it("#validateAndAcceptApiNode - should accept a node that verifies", async ({ processor, repository, events }) => {
		repository.hasApiNode = () => false;
		const setApiNode = spy(repository, "setApiNode");
		const forgetPendingApiNode = spy(repository, "forgetPendingApiNode");
		const dispatch = spy(events, "dispatch");

		await processor.validateAndAcceptApiNode(apiNode);

		setApiNode.calledWith(apiNode);
		dispatch.calledWith(Events.ApiNodeEvent.Added, apiNode);
		forgetPendingApiNode.calledWith(apiNode);
	});

	it("#validateAndAcceptApiNode - should skip a node that is already known or pending", async ({
		processor,
		repository,
		apiNodeVerifier,
	}) => {
		const verify = spy(apiNodeVerifier, "verify");
		const setPendingApiNode = spy(repository, "setPendingApiNode");

		await processor.validateAndAcceptApiNode(apiNode);

		repository.hasApiNode = () => false;
		repository.hasPendingApiNode = () => true;

		await processor.validateAndAcceptApiNode(apiNode);

		verify.neverCalled();
		setPendingApiNode.neverCalled();
	});

	it("#validateAndAcceptApiNode - should not accept a node that fails verification", async ({
		processor,
		repository,
		apiNodeVerifier,
		events,
	}) => {
		repository.hasApiNode = () => false;
		apiNodeVerifier.verify = async () => false;
		const setApiNode = spy(repository, "setApiNode");
		const forgetPendingApiNode = spy(repository, "forgetPendingApiNode");
		const dispatch = spy(events, "dispatch");

		await processor.validateAndAcceptApiNode(apiNode);

		setApiNode.neverCalled();
		dispatch.neverCalled();
		forgetPendingApiNode.calledWith(apiNode);
	});

	it("#revalidateApiNode - should verify a node that was never pinged", async ({ processor, apiNodeVerifier }) => {
		const verify = spy(apiNodeVerifier, "verify");

		await processor.revalidateApiNode(apiNode);

		verify.calledWith(apiNode);
	});

	it("#revalidateApiNode - should verify a node whose last ping is older than ten minutes", async ({
		processor,
		apiNodeVerifier,
	}) => {
		apiNode.lastPinged = dayjs().subtract(11, "minutes");
		const verify = spy(apiNodeVerifier, "verify");

		await processor.revalidateApiNode(apiNode);

		verify.calledOnce();
	});

	it("#revalidateApiNode - should skip a node that was pinged recently", async ({ processor, apiNodeVerifier }) => {
		apiNode.lastPinged = dayjs().subtract(1, "minute");
		const verify = spy(apiNodeVerifier, "verify");

		await processor.revalidateApiNode(apiNode);

		verify.neverCalled();
	});

	it("#revalidateApiNode - should remove a node that fails verification", async ({
		processor,
		repository,
		apiNodeVerifier,
		events,
	}) => {
		apiNodeVerifier.verify = async () => false;
		const forgetApiNode = spy(repository, "forgetApiNode");
		const dispatch = spy(events, "dispatch");

		await processor.revalidateApiNode(apiNode);

		forgetApiNode.calledWith(apiNode);
		dispatch.calledWith(Events.ApiNodeEvent.Removed, apiNode);
	});

	it("#revalidateApiNode - should ignore a node that is not in the repository", async ({
		processor,
		repository,
		apiNodeVerifier,
	}) => {
		repository.hasApiNode = () => false;
		const verify = spy(apiNodeVerifier, "verify");

		await processor.revalidateApiNode(apiNode);

		verify.neverCalled();
	});
});
