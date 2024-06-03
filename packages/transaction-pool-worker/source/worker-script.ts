import { Ipc } from "@mainsail/kernel";

import { WorkerScriptHandler } from "./worker-handler.js";

const ipcHandler = new Ipc.Handler(new WorkerScriptHandler());

ipcHandler.handleRequest("boot");
ipcHandler.handleRequest("importSnapshot");
