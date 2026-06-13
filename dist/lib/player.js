import assert from 'assert';
import { isChips } from '../type-guards/chips';
export default class Player {
    constructor(arg) {
        this._total = 0;
        this._betSize = 0;
        if (isChips(arg)) {
            this._total = arg;
        }
        else if (arg instanceof Player) {
            this._total = arg._total;
            this._betSize = arg._betSize;
        }
        else {
            throw new Error('Invalid argument');
        }
    }
    stack() {
        return this._total - this._betSize;
    }
    betSize() {
        return this._betSize;
    }
    totalChips() {
        return this._total;
    }
    addToStack(amount) {
        this._total += amount;
    }
    takeFromStack(amount) {
        this._total -= amount;
    }
    bet(amount) {
        assert(amount <= this._total, 'Player cannot bet more than he/she has');
        assert(amount >= this._betSize, 'Player must bet more than he/she has previously');
        this._betSize = amount;
    }
    takeFromBet(amount) {
        assert(amount <= this._betSize, 'Cannot take from bet more than is there');
        this._total -= amount;
        this._betSize -= amount;
    }
}
//# sourceMappingURL=player.js.map