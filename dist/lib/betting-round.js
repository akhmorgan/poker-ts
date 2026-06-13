import assert from 'assert';
import ChipRange from './chip-range';
import Round, { Action as RoundAction } from './round';
export var Action;
(function (Action) {
    Action[Action["LEAVE"] = 0] = "LEAVE";
    Action[Action["MATCH"] = 1] = "MATCH";
    Action[Action["RAISE"] = 2] = "RAISE";
})(Action || (Action = {}));
export class ActionRange {
    constructor(canRaise, chipRange = new ChipRange(0, 0)) {
        this.canRaise = canRaise;
        this.chipRange = chipRange;
    }
}
export default class BettingRound {
    constructor(players, firstToAct, minRaise, biggestBet = 0) {
        this._round = new Round(players.map(player => !!player), firstToAct);
        this._players = players;
        this._biggestBet = biggestBet;
        this._minRaise = minRaise;
        assert(firstToAct < players.length, 'Seat index must be in the valid range');
        assert(players[firstToAct], 'First player to act must exist');
    }
    inProgress() {
        return this._round.inProgress();
    }
    isContested() {
        return this._round.isContested();
    }
    playerToAct() {
        return this._round.playerToAct();
    }
    biggestBet() {
        return this._biggestBet;
    }
    minRaise() {
        return this._minRaise;
    }
    players() {
        return this._round.activePlayers().map((isActive, index) => {
            return isActive ? this._players[index] : null;
        });
    }
    activePlayers() {
        return this._round.activePlayers();
    }
    numActivePlayers() {
        return this._round.numActivePlayers();
    }
    legalActions() {
        const player = this._players[this._round.playerToAct()];
        assert(player !== null);
        const playerChips = player.totalChips();
        const canRaise = playerChips > this._biggestBet;
        if (canRaise) {
            const minBet = this._biggestBet + this._minRaise;
            const raiseRange = new ChipRange(Math.min(minBet, playerChips), playerChips);
            return new ActionRange(canRaise, raiseRange);
        }
        else {
            return new ActionRange(canRaise);
        }
    }
    actionTaken(action, bet = 0) {
        const player = this._players[this._round.playerToAct()];
        assert(player !== null);
        if (action === Action.RAISE) {
            assert(this.isRaiseValid(bet));
            player.bet(bet);
            this._minRaise = bet - this._biggestBet;
            this._biggestBet = bet;
            let actionFlag = RoundAction.AGGRESSIVE;
            if (player.stack() === 0) {
                actionFlag |= RoundAction.LEAVE;
            }
            this._round.actionTaken(actionFlag);
        }
        else if (action === Action.MATCH) {
            player.bet(Math.min(this._biggestBet, player.totalChips()));
            let actionFlag = RoundAction.PASSIVE;
            if (player.stack() === 0) {
                actionFlag |= RoundAction.LEAVE;
            }
            this._round.actionTaken(actionFlag);
        }
        else {
            assert(action === Action.LEAVE);
            this._round.actionTaken(RoundAction.LEAVE);
        }
    }
    isRaiseValid(bet) {
        const player = this._players[this._round.playerToAct()];
        assert(player !== null);
        const playerChips = player.stack() + player.betSize();
        const minBet = this._biggestBet + this._minRaise;
        if (playerChips > this._biggestBet && playerChips < minBet) {
            return bet === playerChips;
        }
        return bet >= minBet && bet <= playerChips;
    }
}
//# sourceMappingURL=betting-round.js.map