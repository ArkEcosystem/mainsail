import sinon from "sinon";

import { describe } from "../../../core-test-framework";
import { IpcSubprocess } from "./ipc-subprocess";

type MyRpcInterface = {
	myRpcActionMethod(a: number, b: number): void;
	myRpcRequestMethod(a: number, b: number): Promise<string>;
};

describe<{
	subprocess: any;
}>("IpcSubprocess", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.subprocess = {
			on: () => undefined,
			send: () => undefined,
		};
	});
	it("should subscribe to subprocess message event", (context) => {
		const onSpy = spy(context.subprocess, "on");

		new IpcSubprocess<MyRpcInterface>(context.subprocess);

		onSpy.calledWith("message", sinon.match.func);
	});

	it("should return pending promises count", (context) => {
		const ipcSubprocess = new IpcSubprocess<MyRpcInterface>(context.subprocess);

		ipcSubprocess.sendRequest("myRpcRequestMethod", 1, 2);

		assert.equal(ipcSubprocess.getQueueSize(), 1);
	});

	it("should call subprocess send method", (context) => {
		const sendSpy = spy(context.subprocess, "send");

		const ipcSubprocess = new IpcSubprocess<MyRpcInterface>(context.subprocess);
		ipcSubprocess.sendAction("myRpcActionMethod", 1, 2);

		sendSpy.calledWith({
			method: "myRpcActionMethod",
			args: [1, 2],
		});
	});

	it("should return result when reply message arrives", async (context) => {
		const sendSpy = spy(context.subprocess, "send");

		const ipcSubprocess = new IpcSubprocess<MyRpcInterface>(context.subprocess);

		const promise = ipcSubprocess.sendRequest("myRpcRequestMethod", 1, 2);

		ipcSubprocess["onSubprocessMessage"]({ id: 2, result: "hello" }); // Unknown id, should be ignored
		ipcSubprocess["onSubprocessMessage"]({ id: 1, result: "hello" });

		assert.equal(await promise, "hello");
		sendSpy.calledWith({ id: 1, method: "myRpcRequestMethod", args: [1, 2] });
	});

	it("should rethrow error when reply message arrives", async (context) => {
		const sendSpy = spy(context.subprocess, "send");

		const ipcSubprocess = new IpcSubprocess<MyRpcInterface>(context.subprocess);

		const promise = ipcSubprocess.sendRequest("myRpcRequestMethod", 1, 2);

		ipcSubprocess["onSubprocessMessage"]({ id: 2, error: "failure" }); // Unknown id, should be ignored
		ipcSubprocess["onSubprocessMessage"]({ id: 1, error: "failure" });

		await assert.rejects(() => promise, "failure");
		sendSpy.calledWith({ id: 1, method: "myRpcRequestMethod", args: [1, 2] });
	});
});
