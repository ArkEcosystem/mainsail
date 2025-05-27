import { http } from "/mainsail/packages/utils/distribution/index.js";

const parseJSONRPCResult = (method, response) => {
    if (response.statusCode !== 200) {
        const error = `Error on ${method}. Status code is ${response.statusCode}`;
        console.error(error);
        throw new Error(error);
    } else if (response.data.error) {
        const error = `Error on ${method}. Error code: ${response.data.error.code}, message: ${response.data.error.message}`;
        console.error(error);
        throw new Error(error);
    }

    return response.data.result;
};

const JSONRPCCall = async (peer, method, params) => {
    try {
        const response = await http.post(`${peer.apiEvmUrl}/api/`, {
            headers: { "Content-Type": "application/json" },
            body: {
                jsonrpc: "2.0",
                method,
                params,
                id: null,
            },
        });

        return parseJSONRPCResult(method, response);
    } catch (err) {
        console.error(`Error on ${method}. ${err.message}`);
        throw err;
    }
};

export const getWalletNonce = async (peer, address) => {
    return parseInt(await JSONRPCCall(peer, "eth_getTransactionCount", [address, "latest"]));
};

export const getApiHttp = async (peer, path) => {
    try {
        if (!path.startsWith("/")) {
            path = `/${path}`;
        }

        const response = await http.get(`${peer.apiHttpUrl}/api${path}`);
        if (response.statusCode !== 200) {
            console.log(JSON.stringify(response.data));

            return response.data.data;
        } else {
            return response.data.data;
        }
    } catch (err) {
        console.error(`getApiHttp failed: ${err.message}`);
    }
};

export const postTransactions = async (peer, transactions) => {
    try {
        const response = await http.post(`${peer.apiTxPoolUrl}/api/transactions`, {
            headers: { "Content-Type": "application/json" },
            body: {
                transactions,
            },
        });

        if (response.statusCode !== 200) {
            console.log(JSON.stringify(response.data));

            return response.data;
        } else {
            return response.data;
        }
    } catch (err) {
        console.error(`Cannot post transaction: ${err.message}`);
    }
};
