import { Component, mount, signal, usePlugin, xml } from "@odoo/owl";
import { ORM } from "./orm";
import { Order, Partner } from "./models";

// An isolated plugin system inside a plugin.
//
// The ORM plugin creates its own plugin host (`usePluginHost(..., { isolated:
// true })`), whose plugins are the models (Partner, Order). The components
// only know the ORM: they use models by name, as with `orm.search(...)` in
// Odoo. Models are not visible from the application, and they cannot see its
// plugins: the ORM decides what crosses the boundary (here: a logger).
//
// - Partner loads its data asynchronously: the app waits for it.
// - "Install Sales" adds the Order model at runtime: the set of the isolated
//   host is reactive, so the model is started on the fly.
// - Order depends on Partner, and deletes the orders of a deleted partner.
//
// Try: add `partner = usePlugin(Partner)` in a component: it throws, models
// are not in the application's plugin set.

class Partners extends Component {
    static template = xml`
        <div class="card">
            <h3>Partners</h3>
            <ul>
                <t t-foreach="this.orm.search('res.partner')" t-as="partner" t-key="partner.id">
                    <li>
                        <t t-out="partner.name"/>
                        <button class="link" t-on-click="() => this.orm.unlink('res.partner', partner.id)">×</button>
                    </li>
                </t>
            </ul>
            <input placeholder="New partner" t-model="this.name"/>
            <button t-on-click="this.add">Add</button>
        </div>`;

    orm = usePlugin(ORM);
    name = signal("");

    add() {
        const name = this.name().trim();
        if (name) {
            this.orm.create("res.partner", { name });
            this.name.set("");
        }
    }
}

class Orders extends Component {
    static template = xml`
        <div class="card">
            <h3>Sales orders</h3>
            <ul>
                <t t-foreach="this.orm.search('sale.order')" t-as="order" t-key="order.id">
                    <li>
                        SO<t t-out="order.id"/> — <t t-out="this.partnerName(order)"/>
                        (<t t-out="order.state"/>)
                        <button t-if="order.state === 'draft'" class="link" t-on-click="() => this.orm.call('sale.order', 'confirm', order.id)">confirm</button>
                    </li>
                </t>
            </ul>
            <select t-model="this.partnerId">
                <t t-foreach="this.orm.search('res.partner')" t-as="partner" t-key="partner.id">
                    <option t-att-value="partner.id" t-out="partner.name"/>
                </t>
            </select>
            <button t-on-click="this.add">New order</button>
        </div>`;

    orm = usePlugin(ORM);
    partnerId = signal("");

    partnerName(order) {
        return this.orm.browse("res.partner", order.partnerId)?.name;
    }

    add() {
        const partnerId = Number(this.partnerId()) || this.orm.search("res.partner")[0]?.id;
        if (partnerId) {
            this.orm.create("sale.order", { partnerId });
        }
    }
}

class Logs extends Component {
    static template = xml`
        <div class="card logs">
            <h3>ORM log</h3>
            <t t-foreach="this.orm.logs.slice(-8)" t-as="log" t-key="log_index">
                <div t-out="log"/>
            </t>
        </div>`;

    orm = usePlugin(ORM);
}

class Root extends Component {
    static components = { Partners, Orders, Logs };
    static template = xml`
        <div class="app">
            <Partners/>
            <Orders t-if="this.orm.isInstalled('sale.order')"/>
            <div t-else="" class="card">
                <button t-on-click="() => this.orm.install(this.Order)">Install Sales</button>
            </div>
            <Logs/>
        </div>`;

    orm = usePlugin(ORM);
    Order = Order;
}

mount(Root, document.body, {
    templates: TEMPLATES,
    dev: true,
    plugins: [ORM],
    // the models installed at startup
    config: { models: [Partner] },
});
