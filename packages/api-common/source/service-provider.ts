import { Providers } from "@mainsail/kernel";
import Joi from "joi";

// import { preparePlugins } from "./plugins";
import { AbstractServer, ServerType } from "./server";
import { preparePlugins } from "./plugins";

export type ServerConstructor<T extends AbstractServer> = new (...args: any[]) => T;
export abstract class AbstractServiceProvider<T extends AbstractServer> extends Providers.ServiceProvider {

    protected abstract httpIdentifier(): symbol;
    protected abstract httpsIdentifier(): symbol;
    protected abstract getServerConstructor(): ServerConstructor<T>;
    protected abstract getHandlers(): any | any[];

    public async register(): Promise<void> {
        if (this.config().get("server.http.enabled")) {
            await this.buildServer(ServerType.Http, this.httpIdentifier());
        }

        if (this.config().get("server.https.enabled")) {
            await this.buildServer(ServerType.Https, this.httpsIdentifier());
        }
    }

    public async boot(): Promise<void> {
        if (this.config().get("server.http.enabled")) {
            await this.app.get<T>(this.httpIdentifier()).boot();
        }

        if (this.config().get("server.https.enabled")) {
            await this.app.get<T>(this.httpsIdentifier()).boot();
        }
    }

    public async dispose(): Promise<void> {
        if (this.config().get("server.http.enabled")) {
            await this.app.get<T>(this.httpIdentifier()).dispose();
        }

        if (this.config().get("server.https.enabled")) {
            await this.app.get<T>(this.httpsIdentifier()).dispose();
        }
    }

    public configSchema(): Joi.ObjectSchema {
        return Joi.object({
            plugins: Joi.object({
                pagination: Joi.object({
                    limit: Joi.number().integer().min(0).required(),
                }).required(),
                socketTimeout: Joi.number().integer().min(0).required(),
                trustProxy: Joi.bool().required(),
                whitelist: Joi.array().items(Joi.string()).required(),
            }).required(),

            server: Joi.object({
                http: Joi.object({
                    enabled: Joi.bool().required(),
                    host: Joi.string().required(),
                    port: Joi.number().integer().min(1).max(65_535).required(),
                }).required(),
                https: Joi.object({
                    enabled: Joi.bool().required(),
                    host: Joi.string().required(),
                    port: Joi.number().integer().min(1).max(65_535).required(),
                    tls: Joi.object({
                        cert: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
                        key: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
                    }).required(),
                }).required(),
            }).required(),
        }).unknown(true);
    }

    protected async buildServer(type: ServerType, id: symbol): Promise<void> {
        this.app.bind<T>(id).to(this.getServerConstructor()).inSingletonScope();

        const server = this.app.get<T>(id);

        await server.initialize(type, {
            ...this.config().get(`server.${type.toLowerCase()}`),

            routes: {
                cors: true,
            },
        });

        await server.register(preparePlugins(this.config().get("plugins")));

        await server.register({
            plugin: this.getHandlers(),
            routes: { prefix: "/api" },
        });
    }
}
