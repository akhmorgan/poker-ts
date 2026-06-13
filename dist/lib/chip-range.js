export default class ChipRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    contains(amount) {
        return this.min <= amount && amount <= this.max;
    }
}
//# sourceMappingURL=chip-range.js.map