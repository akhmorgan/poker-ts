// Facade for the Table class that confirms with the API of https://github.com/JankoDedic/poker.js
import Table, { AutomaticAction as AutomaticActionFlag } from '../lib/table';
import { RoundOfBetting } from '../lib/community-cards';
import { CardRank, CardSuit } from '../lib/card';
import { Action as ActionFlag } from '../lib/dealer';
const cardMapper = card => ({
    // @ts-ignore
    rank: CardRank[card.rank].replace(/^_/, ''),
    // @ts-ignore
    suit: CardSuit[card.suit].toLowerCase(),
});
const seatArrayMapper = player => player === null
    ? null
    : {
        totalChips: player.totalChips(),
        stack: player.stack(),
        betSize: player.betSize(),
    };
const actionFlagToStringArray = (actionFlag) => {
    const actions = [];
    if (actionFlag & ActionFlag.FOLD)
        actions.push('fold');
    if (actionFlag & ActionFlag.CHECK)
        actions.push('check');
    if (actionFlag & ActionFlag.CALL)
        actions.push('call');
    if (actionFlag & ActionFlag.BET)
        actions.push('bet');
    if (actionFlag & ActionFlag.RAISE)
        actions.push('raise');
    return actions;
};
const automaticActionFlagToStringArray = (automaticActionFlag) => {
    const automaticActions = [];
    if (automaticActionFlag & AutomaticActionFlag.FOLD)
        automaticActions.push('fold');
    if (automaticActionFlag & AutomaticActionFlag.CHECK_FOLD)
        automaticActions.push('check/fold');
    if (automaticActionFlag & AutomaticActionFlag.CHECK)
        automaticActions.push('check');
    if (automaticActionFlag & AutomaticActionFlag.CALL)
        automaticActions.push('call');
    if (automaticActionFlag & AutomaticActionFlag.CALL_ANY)
        automaticActions.push('call any');
    if (automaticActionFlag & AutomaticActionFlag.ALL_IN)
        automaticActions.push('all-in');
    return automaticActions;
};
const stringToAutomaticActionFlag = (automaticAction) => {
    switch (automaticAction) {
        case 'fold':
            return AutomaticActionFlag.FOLD;
        case 'check/fold':
            return AutomaticActionFlag.CHECK_FOLD;
        case 'check':
            return AutomaticActionFlag.CHECK;
        case 'call':
            return AutomaticActionFlag.CALL;
        case 'call any':
            return AutomaticActionFlag.CALL_ANY;
        case 'all-in':
            return AutomaticActionFlag.ALL_IN;
    }
};
export default class Poker {
    constructor(forcedBets, numSeats) {
        const { ante, bigBlind: big, smallBlind: small } = forcedBets;
        this._table = new Table({ ante, blinds: { big, small } }, numSeats);
    }
    playerToAct() {
        return this._table.playerToAct();
    }
    button() {
        return this._table.button();
    }
    seats() {
        return this._table.seats().map(seatArrayMapper);
    }
    handPlayers() {
        return this._table.handPlayers().map(seatArrayMapper);
    }
    numActivePlayers() {
        return this._table.numActivePlayers();
    }
    pots() {
        return this._table.pots().map(pot => ({
            size: pot.size(),
            eligiblePlayers: pot.eligiblePlayers(),
        }));
    }
    forcedBets() {
        const { ante = 0, blinds: { big: bigBlind, small: smallBlind } } = this._table.forcedBets();
        return {
            ante,
            smallBlind,
            bigBlind,
        };
    }
    setForcedBets(forcedBets) {
        const { ante, bigBlind: big, smallBlind: small } = forcedBets;
        this._table.setForcedBets({ ante, blinds: { small, big } });
    }
    numSeats() {
        return this._table.numSeats();
    }
    startHand(seat) {
        this._table.startHand(seat);
    }
    isHandInProgress() {
        return this._table.handInProgress();
    }
    isBettingRoundInProgress() {
        return this._table.bettingRoundInProgress();
    }
    areBettingRoundsCompleted() {
        return this._table.bettingRoundsCompleted();
    }
    roundOfBetting() {
        const rob = this._table.roundOfBetting();
        // @ts-ignore
        return RoundOfBetting[rob].toLowerCase();
    }
    communityCards() {
        return this._table.communityCards().cards().map(cardMapper);
    }
    legalActions() {
        const { action, chipRange } = this._table.legalActions();
        return {
            actions: actionFlagToStringArray(action),
            chipRange,
        };
    }
    holeCards() {
        return this._table.holeCards().map(cards => {
            return cards === null
                ? null
                : cards.map(cardMapper);
        });
    }
    actionTaken(action, betSize) {
        this._table.actionTaken(ActionFlag[action.toUpperCase()], betSize);
    }
    endBettingRound() {
        this._table.endBettingRound();
    }
    showdown() {
        this._table.showdown();
    }
    winners() {
        return this._table.winners().map(potWinners => potWinners.map(winner => {
            const [seatIndex, hand, holeCards] = winner;
            return [
                seatIndex,
                {
                    cards: hand.cards().map(cardMapper),
                    ranking: hand.ranking(),
                    strength: hand.strength(),
                },
                holeCards.map(cardMapper),
            ];
        }));
    }
    automaticActions() {
        return this._table.automaticActions().map(action => {
            return action === null
                ? null
                : automaticActionFlagToStringArray(action)[0];
        });
    }
    canSetAutomaticActions(seatIndex) {
        return this._table.canSetAutomaticAction(seatIndex);
    }
    legalAutomaticActions(seatIndex) {
        const automaticActionFlag = this._table.legalAutomaticActions(seatIndex);
        return automaticActionFlagToStringArray(automaticActionFlag);
    }
    setAutomaticAction(seatIndex, action) {
        const automaticAction = action === null ? action : stringToAutomaticActionFlag(action);
        this._table.setAutomaticAction(seatIndex, automaticAction);
    }
    sitDown(seatIndex, buyIn) {
        this._table.sitDown(seatIndex, buyIn);
    }
    standUp(seatIndex) {
        this._table.standUp(seatIndex);
    }
}
//# sourceMappingURL=poker.js.map