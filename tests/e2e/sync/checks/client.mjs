import { http } from "/mainsail/packages/utils/distribution/index.js";

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
