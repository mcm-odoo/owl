import {
    Plugin,
    PluginSet,
    createPluginKey,
    proxy,
    t,
    useConfig,
    usePlugin,
    usePluginHost,
} from "@odoo/owl";

// The ORM owns an *isolated* plugin system: its plugins are the models.
// Models can depend on each other (with `usePlugin`), but they cannot see the
// plugins of the application, and the application cannot see them: the ORM
// plugin is the only interface between the two worlds.

// A bridge to the external world: models log through this key, and the ORM
// (which creates the isolated system) decides what it does.
export const Logger = createPluginKey("orm.logger");

// Base class of the models: an in-memory table of reactive records.
export class Model extends Plugin {
    static modelName = "";

    log = usePlugin(Logger);
    records = proxy([]);
    nextId = 1;

    get name() {
        return this.constructor.modelName;
    }

    search(filter = () => true) {
        return this.records.filter(filter);
    }

    browse(id) {
        return this.records.find((record) => record.id === id) ?? null;
    }

    create(values) {
        const id = this.nextId++;
        this.records.push({ id, ...values });
        this.log(`${this.name}: created #${id}`);
        return id;
    }

    write(id, values) {
        Object.assign(this.browse(id), values);
        this.log(`${this.name}: updated #${id} (${Object.keys(values).join(", ")})`);
    }

    unlink(id) {
        const index = this.records.findIndex((record) => record.id === id);
        if (index >= 0) {
            this.records.splice(index, 1);
            this.log(`${this.name}: deleted #${id}`);
        }
    }
}

// The interface of the ORM for the application: models are designated by
// their name ("res.partner"), never by their class.
export class ORM extends Plugin {
    logs = proxy([]);
    installed = proxy([]); // names of the installed models (reactive)
    classes = new Map(); // name -> model class

    setup() {
        // the definitions of the isolated system: a reactive set, so models
        // installed later are started by its host
        this.models = new PluginSet().add(Logger, {
            use: () => (message) => this.logs.push(message),
        });
        this.install(...useConfig("models", t.array(t.constructor(Model)).optional([])));

        // an isolated host: a root host, not linked to the application's one,
        // destroyed with the ORM. The ORM waits for it: the application (and
        // so its first render) waits for the models to be loaded
        this.host = usePluginHost(this.models, { isolated: true });
    }

    install(...Models) {
        for (const M of Models) {
            this.models.add(M);
            this.classes.set(M.modelName, M);
            this.installed.push(M.modelName);
        }
    }

    isInstalled(name) {
        return this.installed.includes(name);
    }

    model(name) {
        const M = this.classes.get(name);
        if (!M) {
            throw new Error(`Model "${name}" is not installed`);
        }
        return this.host.getPlugin(M);
    }

    search(name, filter) {
        return this.model(name).search(filter);
    }

    browse(name, id) {
        return this.model(name).browse(id);
    }

    create(name, values) {
        return this.model(name).create(values);
    }

    write(name, id, values) {
        this.model(name).write(id, values);
    }

    unlink(name, id) {
        this.model(name).unlink(id);
    }

    // calls any other method of a model, like `call_kw` in Odoo
    call(name, method, ...args) {
        return this.model(name)[method](...args);
    }
}
