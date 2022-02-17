const { Blocks } = require("../../dist");

const data = require("../helpers").getJSONFixture("block/deserialized/transactions");

exports["core"] = () => {
	return Blocks.Serializer.serializeWithTransactions(data);
};
