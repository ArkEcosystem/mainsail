import { Ipc } from "@mainsail/kernel";

import { WorkerScriptHandler } from "./worker-handler";

const ipcHandler = new Ipc.Handler(new WorkerScriptHandler());

ipcHandler.handleRequest("boot");
ipcHandler.handleRequest("walletSignature");
ipcHandler.handleRequest("consensusSignature");
ipcHandler.handleRequest("blockFactory");
ipcHandler.handleRequest("transactionFactory");
ipcHandler.handleRequest("publicKeyFactory");
