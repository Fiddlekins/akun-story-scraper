export default class ItemStats {
    constructor() {
        this.added = 0;
        this.updatedBody = 0;
        this.updatedTs = 0;
        this.same = 0;
        this.resurrected = 0;
    }

    /**
     * @param {ItemStats} that
     */
    add(that) {
        this.added += that.added;
        this.updatedBody += that.updatedBody;
        this.updatedTs += that.updatedTs;
        this.same += that.same;
        this.resurrected += that.resurrected;
    }
};
