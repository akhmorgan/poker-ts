import assert from 'assert';
export var Action;
(function (Action) {
    Action[Action["LEAVE"] = 1] = "LEAVE";
    Action[Action["PASSIVE"] = 2] = "PASSIVE";
    Action[Action["AGGRESSIVE"] = 4] = "AGGRESSIVE";
})(Action || (Action = {}));
export default class Round {
    constructor(activePlayers, firstToAct) {
        this._contested = false;
        this._firstAction = true;
        this._numActivePlayers = 0;
        this._activePlayers = activePlayers;
        this._playerToAct = firstToAct;
        this._lastAggressiveActor = firstToAct;
        this._numActivePlayers = activePlayers.filter(player => !!player).length;
        assert(firstToAct < activePlayers.length);
    }
    activePlayers() {
        return this._activePlayers;
    }
    playerToAct() {
        return this._playerToAct;
    }
    lastAggressiveActor() {
        return this._lastAggressiveActor;
    }
    numActivePlayers() {
        return this._numActivePlayers;
    }
    inProgress() {
        return (this._contested || this._numActivePlayers > 1) && (this._firstAction || this._playerToAct !== this._lastAggressiveActor);
    }
    isContested() {
        return this._contested;
    }
    actionTaken(action) {
        assert(this.inProgress());
        assert(!(action & Action.PASSIVE && action & Action.AGGRESSIVE));
        if (this._firstAction) {
            this._firstAction = false;
        }
        // Implication: if there is aggressive action => the next player is contested
        if (action & Action.AGGRESSIVE) {
            this._lastAggressiveActor = this._playerToAct;
            this._contested = true;
        }
        else if (action & Action.PASSIVE) {
            this._contested = true;
        }
        if (action & Action.LEAVE) {
            this._activePlayers[this._playerToAct] = false;
            --this._numActivePlayers;
        }
        this.incrementPlayer();
    }
    incrementPlayer() {
        do {
            ++this._playerToAct;
            if (this._playerToAct === this._activePlayers.length)
                this._playerToAct = 0;
            if (this._playerToAct === this._lastAggressiveActor)
                break;
        } while (!this._activePlayers[this._playerToAct]);
    }
}
//# sourceMappingURL=round.js.map