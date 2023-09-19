import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
    sandbox: Sandbox;
}>("Validator", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {

    let apiContext: ApiContext;

    beforeAll(async (context) => {
        nock.enableNetConnect();
        apiContext = await prepareSandbox(context);
    });

    afterAll((context) => {
        nock.disableNetConnect();
        apiContext.dispose();
    })

    beforeEach(async (context) => {
        await apiContext.reset();
    });

    afterEach(async (context) => {
        await apiContext.reset();
    });

    it("/transactions", async () => {
        const { statusCode, data } = await request("/transactions");
        assert.equal(statusCode, 200);
    });
});