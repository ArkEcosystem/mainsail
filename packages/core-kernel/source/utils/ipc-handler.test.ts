import { describe } from "../../../core-test-framework";

import { IpcHandler } from "./ipc-handler";

type MyRpcInterface = {
	myRpcActionMethod(a: number, b: number): void;
	myRpcRequestMethod(a: number, b: number): Promise<string>;
};

describe("IpcHandler", ({ it, spy }) => {
	it("should call method on process message", () => {
		try {
			const myHandler = { myRpcActionMethod: () => undefined };
			const myRpcActionMethodSpy = spy(myHandler, "myRpcActionMethod");
			const ipcHandler = new IpcHandler<MyRpcInterface>(myHandler as any);
			ipcHandler.handleAction("myRpcActionMethod");
			process.listeners("message").forEach((l) => {
				l({ method: "myRpcActionMethod", args: [1, 2] }, null);
			});
			myRpcActionMethodSpy.calledWith(1, 2);
		} finally {
			process.removeAllListeners("message");
		}
	});

	it("should call method, await result, and send result back", async () => {
		try {
			const myHandler = {
				myRpcRequestMethod: () => "hello",
			};
			const myRpcRequestMethodSpy = spy(myHandler, "myRpcRequestMethod");

			const ipcHandler = new IpcHandler<MyRpcInterface>(myHandler as any);

			ipcHandler.handleRequest("myRpcRequestMethod");

			process.send = () => true;
			const processSendSpy = spy(process, "send");

			process.listeners("message").forEach((l) => {
				l({ id: 1, method: "myRpcRequestMethod", args: [1, 2] }, null);
			});

			// @ts-ignore
			await myHandler.myRpcRequestMethod.getCall(0).proxy();

			myRpcRequestMethodSpy.calledWith(1, 2);
			processSendSpy.calledWith({ id: 1, result: "hello" });
		} finally {
			process.removeAllListeners("message");
		}
	});

	it("should call method, await result, catch error and send error back", async () => {
		try {
			const myHandler = {
				myRpcRequestMethod: () => {
					throw new Error("hello");
				},
			};
			const myRpcRequestMethodSpy = spy(myHandler, "myRpcRequestMethod");

			const ipcHandler = new IpcHandler<MyRpcInterface>(myHandler as any);

			ipcHandler.handleRequest("myRpcRequestMethod");

			process.send = () => true;
			const processSendSpy = spy(process, "send");

			process.listeners("message").forEach((l) => {
				l({ id: 1, method: "myRpcRequestMethod", args: [1, 2] }, null);
			});

			try {
				// @ts-ignore
				await myHandler.myRpcRequestMethod.getCall(0).proxy();
			} catch (error) {}

			myRpcRequestMethodSpy.calledWith(1, 2);
			processSendSpy.calledWith({ id: 1, error: "hello" });
		} finally {
			process.removeAllListeners("message");
		}
	});
});
