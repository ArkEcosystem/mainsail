import { Container, inject, injectable, tagged } from "inversify";

import { describe } from "../../test-framework/source";
import { anyAncestorOrTargetTagged } from "./selectors";

const Identifiers = {
	IdentityName: Symbol.for("IdentityName"),
	KeyPairFactory: Symbol.for("KeyPairFactory"),
	PublicKeyFactory: Symbol.for("PublicKeyFactory"),
};

interface IKeyPair {
	getPublicKey(): string;
}

interface IPublicKey {
	getPublicKey(): string;
}

@injectable()
class KeyPair implements IKeyPair {
	@inject(Identifiers.IdentityName)
	private identityName!: string;

	getPublicKey(): string {
		return this.identityName + " Public Key";
	}
}

@injectable()
class PublicKey implements IPublicKey {
	@inject(Identifiers.KeyPairFactory)
	keyPairFactory!: IKeyPair;

	getPublicKey(): string {
		return "Public: " + this.keyPairFactory.getPublicKey();
	}
}

describe<{
	container: Container;
}>("anyAncestorOrTargetTaggedFirst", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		const container = context.container;
		container
			.bind<string>(Identifiers.IdentityName)
			.toConstantValue("ECDSA")
			.when(anyAncestorOrTargetTagged("key", "ecdsa"));
		container
			.bind<IKeyPair>(Identifiers.KeyPairFactory)
			.to(KeyPair)
			.inSingletonScope()
			.when(anyAncestorOrTargetTagged("key", "ecdsa"));

		container
			.bind<IPublicKey>(Identifiers.PublicKeyFactory)
			.to(PublicKey)
			.inSingletonScope()
			.when(anyAncestorOrTargetTagged("key", "ecdsa"));

		container
			.bind<string>(Identifiers.IdentityName)
			.toConstantValue("BLS")
			.when(anyAncestorOrTargetTagged("key", "bls"));
		container
			.bind<IKeyPair>(Identifiers.KeyPairFactory)
			.to(KeyPair)
			.inSingletonScope()
			.when(anyAncestorOrTargetTagged("key", "bls"));

		container
			.bind<IPublicKey>(Identifiers.PublicKeyFactory)
			.to(PublicKey)
			.inSingletonScope()
			.when(anyAncestorOrTargetTagged("key", "bls"));
	});

	it("should be bound", ({ container }) => {
		assert.true(container.isBound(Identifiers.IdentityName, { tag: { key: "key", value: "ecdsa" } }));
		assert.true(container.isBound(Identifiers.KeyPairFactory, { tag: { key: "key", value: "ecdsa" } }));
		assert.true(container.isBound(Identifiers.PublicKeyFactory, { tag: { key: "key", value: "ecdsa" } }));

		assert.true(container.isBound(Identifiers.IdentityName, { tag: { key: "key", value: "bls" } }));
		assert.true(container.isBound(Identifiers.KeyPairFactory, { tag: { key: "key", value: "bls" } }));
		assert.true(container.isBound(Identifiers.PublicKeyFactory, { tag: { key: "key", value: "bls" } }));
	});

	it("should not be bound", ({ container }) => {
		assert.false(container.isBound(Identifiers.IdentityName));
		assert.false(container.isBound(Identifiers.KeyPairFactory));
		assert.false(container.isBound(Identifiers.PublicKeyFactory));

		assert.false(container.isBound(Identifiers.IdentityName, { tag: { key: "key", value: "test" } }));
		assert.false(container.isBound(Identifiers.KeyPairFactory, { tag: { key: "key", value: "test" } }));
		assert.false(container.isBound(Identifiers.PublicKeyFactory, { tag: { key: "key", value: "test" } }));

		assert.false(container.isBound(Identifiers.IdentityName, { tag: { key: "test", value: "bls" } }));
		assert.false(container.isBound(Identifiers.KeyPairFactory, { tag: { key: "test", value: "bls" } }));
		assert.false(container.isBound(Identifiers.PublicKeyFactory, { tag: { key: "test", value: "bls" } }));
	});

	it("should match tag on target", (context) => {
		const identityNameEcdsa = context.container.get<string>(Identifiers.IdentityName, {
			tag: { key: "key", value: "ecdsa" },
		});
		assert.equal(identityNameEcdsa, "ECDSA");
		const identityNameBls = context.container.get<string>(Identifiers.IdentityName, {
			tag: { key: "key", value: "bls" },
		});
		assert.equal(identityNameBls, "BLS");
	});

	it("should match tag on parent", (context) => {
		const keyPairEcdsa = context.container.get<IKeyPair>(Identifiers.KeyPairFactory, {
			tag: { key: "key", value: "ecdsa" },
		});
		assert.equal(keyPairEcdsa.getPublicKey(), "ECDSA Public Key");
		assert.instance(keyPairEcdsa, KeyPair);

		const keyPairBls = context.container.get<IKeyPair>(Identifiers.KeyPairFactory, {
			tag: { key: "key", value: "bls" },
		});
		assert.equal(keyPairBls.getPublicKey(), "BLS Public Key");
		assert.instance(keyPairBls, KeyPair);
	});

	it("should not match when attempting to load parent with invalid tag values", (context) => {
		assert.throws(() => context.container.get<string>(Identifiers.KeyPairFactory));

		assert.throws(() =>
			context.container.get<string>(Identifiers.KeyPairFactory, { tag: { key: "key", value: "test" } }),
		);

		assert.throws(() =>
			context.container.get<string>(Identifiers.KeyPairFactory, { tag: { key: "test", value: "bls" } }),
		);
	});

	it("should match tag on ancestor", (context) => {
		const publicKeyEcdsa = context.container.get<IPublicKey>(Identifiers.PublicKeyFactory, {
			tag: { key: "key", value: "ecdsa" },
		});
		assert.equal(publicKeyEcdsa.getPublicKey(), "Public: ECDSA Public Key");
		assert.instance(publicKeyEcdsa, PublicKey);

		const publicKeyBls = context.container.get<IPublicKey>(Identifiers.PublicKeyFactory, {
			tag: { key: "key", value: "bls" },
		});
		assert.equal(publicKeyBls.getPublicKey(), "Public: BLS Public Key");
		assert.instance(publicKeyBls, PublicKey);
	});

	it("should not match when attempting to load ancestors with invalid tag values", (context) => {
		assert.throws(() => context.container.get<string>(Identifiers.PublicKeyFactory));

		assert.throws(() =>
			context.container.get<string>(Identifiers.PublicKeyFactory, { tag: { key: "key", value: "test" } }),
		);

		assert.throws(() =>
			context.container.get<string>(Identifiers.PublicKeyFactory, { tag: { key: "test", value: "bls" } }),
		);
	});
});
