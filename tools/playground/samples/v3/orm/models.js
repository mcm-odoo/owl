import { Resource, onWillStart, usePlugin } from "@odoo/owl";
import { Model } from "./orm";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Partner extends Model {
    static modelName = "res.partner";

    // other models react to the deletion of a partner by contributing to this
    // resource: Partner does not have to know them (no dependency cycle)
    onUnlink = new Resource();

    setup() {
        // async initialization: the application waits for it (see ORM)
        onWillStart(async () => {
            await delay(500);
            for (const name of ["Azure Interior", "Deco Addict", "Gemini Furniture"]) {
                this.create({ name });
            }
        });
    }

    unlink(id) {
        for (const callback of this.onUnlink.items()) {
            callback(id);
        }
        super.unlink(id);
    }
}

export class Order extends Model {
    static modelName = "sale.order";

    // a model depending on another model, inside the isolated system
    partners = usePlugin(Partner);

    setup() {
        // cascade: the orders of a deleted partner are deleted too. The
        // callback is removed when this model is destroyed
        this.partners.onUnlink.use((partnerId) => {
            for (const order of this.search((order) => order.partnerId === partnerId)) {
                this.unlink(order.id);
            }
        });
    }

    create(values) {
        if (!this.partners.browse(values.partnerId)) {
            throw new Error(`Unknown partner #${values.partnerId}`);
        }
        return super.create({ state: "draft", ...values });
    }

    confirm(id) {
        this.write(id, { state: "confirmed" });
    }
}
