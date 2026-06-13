import assert from 'assert';
export var RoundOfBetting;
(function (RoundOfBetting) {
    RoundOfBetting[RoundOfBetting["PREFLOP"] = 0] = "PREFLOP";
    RoundOfBetting[RoundOfBetting["FLOP"] = 3] = "FLOP";
    RoundOfBetting[RoundOfBetting["TURN"] = 4] = "TURN";
    RoundOfBetting[RoundOfBetting["RIVER"] = 5] = "RIVER";
})(RoundOfBetting || (RoundOfBetting = {}));
export const next = (roundOfBetting) => {
    if (roundOfBetting === RoundOfBetting.PREFLOP) {
        return RoundOfBetting.FLOP;
    }
    else {
        return roundOfBetting + 1;
    }
};
export default class CommunityCards {
    constructor() {
        this._cards = [];
    }
    cards() {
        return this._cards;
    }
    deal(cards) {
        assert(cards.length <= 5 - this._cards.length, 'Cannot deal more than there is undealt cards');
        this._cards = this._cards.concat(cards);
    }
}
//# sourceMappingURL=community-cards.js.map