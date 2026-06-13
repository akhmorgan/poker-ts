import { next, RoundOfBetting } from './community-cards';
import BettingRound, { Action as BettingRoundAction } from './betting-round';
import PotManager from './pot-manager';
import assert from 'assert';
import Hand from './hand';
import { findIndexAdjacent, nextOrWrap } from '../util/array';
export class ActionRange {
    constructor(chipRange) {
        this.action = Action.FOLD; // You can always fold
        this.chipRange = chipRange;
    }
    contains(action, bet = 0) {
        assert(Dealer.isValid(action), 'The action representation must be valid');
        return action && Dealer.isAggressive(action)
            ? this.chipRange?.contains(bet) ?? false
            : true;
    }
}
export var Action;
(function (Action) {
    Action[Action["FOLD"] = 1] = "FOLD";
    Action[Action["CHECK"] = 2] = "CHECK";
    Action[Action["CALL"] = 4] = "CALL";
    Action[Action["BET"] = 8] = "BET";
    Action[Action["RAISE"] = 16] = "RAISE";
})(Action || (Action = {}));
export default class Dealer {
    constructor(players, button, forcedBets, deck, communityCards, numSeats = 9) {
        this._button = 0;
        this._bettingRound = null;
        this._handInProgress = false;
        this._roundOfBetting = RoundOfBetting.PREFLOP;
        this._bettingRoundsCompleted = false;
        this._players = players;
        this._button = button;
        this._forcedBets = forcedBets;
        this._deck = deck;
        this._communityCards = communityCards;
        this._potManager = new PotManager();
        this._holeCards = new Array(numSeats).fill(null);
        this._winners = [];
        assert(deck.length === 52, 'Deck must be whole');
        assert(communityCards.cards().length === 0, 'No community cards should have been dealt');
    }
    static isValid(action) {
        // Method for counting bits in a 32-bit integer from https://graphics.stanford.edu/~seander/bithacks.html
        action = action - ((action >> 1) & 0x55555555);
        action = (action & 0x33333333) + ((action >> 2) & 0x33333333);
        const bitCount = ((action + (action >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
        return bitCount === 1;
    }
    static isAggressive(action) {
        return !!(action & Action.BET) || !!(action & Action.RAISE);
    }
    handInProgress() {
        return this._handInProgress;
    }
    bettingRoundsCompleted() {
        assert(this.handInProgress(), 'Hand must be in progress');
        return this._bettingRoundsCompleted;
    }
    playerToAct() {
        assert(this.bettingRoundInProgress(), 'Betting round must be in progress');
        assert(this._bettingRound !== null);
        return this._bettingRound.playerToAct();
    }
    players() {
        return this._bettingRound?.players() ?? [];
    }
    // All the players who started in the current betting round
    bettingRoundPlayers() {
        return this._players;
    }
    roundOfBetting() {
        assert(this.handInProgress(), 'Hand must be in progress');
        return this._roundOfBetting;
    }
    numActivePlayers() {
        return this._bettingRound?.numActivePlayers() ?? 0;
    }
    biggestBet() {
        return this._bettingRound?.biggestBet() ?? 0;
    }
    bettingRoundInProgress() {
        return this._bettingRound?.inProgress() ?? false;
    }
    isContested() {
        return this._bettingRound?.isContested() ?? false;
    }
    legalActions() {
        assert(this.bettingRoundInProgress(), 'Betting round must be in progress');
        assert(this._bettingRound !== null);
        const player = this._players[this._bettingRound.playerToAct()];
        const actions = this._bettingRound.legalActions();
        const actionRange = new ActionRange(actions.chipRange);
        // Below we take care of differentiating between check/call and bet/raise,
        // which the betting_round treats as just "match" and "raise".
        assert(player !== null);
        if (this._bettingRound.biggestBet() - player.betSize() === 0) {
            actionRange.action |= Action.CHECK;
            // Typically you can always bet or raise if you can check. Exception is if you are the big blind and have no
            // chips left after the blind has been paid, in which case you should be allowed to check but not bet or
            // raise.
            if (actions.canRaise) {
                // If this guy can check, with his existing bet_size, he is the big blind.
                if (player.betSize() > 0) {
                    actionRange.action |= Action.RAISE;
                }
                else {
                    actionRange.action |= Action.BET;
                }
            }
        }
        else {
            actionRange.action |= Action.CALL;
            // If you can call, you may or may not be able to raise.
            if (actions.canRaise) {
                actionRange.action |= Action.RAISE;
            }
        }
        return actionRange;
    }
    pots() {
        assert(this.handInProgress(), 'Hand must be in progress');
        return this._potManager.pots();
    }
    button() {
        return this._button;
    }
    holeCards() {
        assert(this.handInProgress() || this.bettingRoundInProgress(), 'Hand must be in progress or showdown must have ended');
        return this._holeCards;
    }
    startHand() {
        assert(!this.handInProgress(), 'Hand must not be in progress');
        this._bettingRoundsCompleted = false;
        this._roundOfBetting = RoundOfBetting.PREFLOP;
        this._winners = [];
        this.collectAnte();
        const bigBlindSeat = this.postBlinds();
        const firstAction = this.nextOrWrap(bigBlindSeat);
        this.dealHoleCards();
        if (this._players.filter((player, seat) => player !== null && (player.stack() !== 0 || seat === bigBlindSeat)).length > 1) {
            this._bettingRound = new BettingRound([...this._players], firstAction, this._forcedBets.blinds.big, this._forcedBets.blinds.big);
        }
        this._handInProgress = true;
    }
    actionTaken(action, bet) {
        assert(this.bettingRoundInProgress(), 'Betting round must be in progress');
        assert(this.legalActions().contains(action, bet), 'Action must be legal');
        assert(this._bettingRound !== null);
        if (action & Action.CHECK || action & Action.CALL) {
            this._bettingRound.actionTaken(BettingRoundAction.MATCH);
        }
        else if (action & Action.BET || action & Action.RAISE) {
            this._bettingRound.actionTaken(BettingRoundAction.RAISE, bet);
        }
        else {
            assert(action & Action.FOLD);
            const foldingPlayer = this._players[this.playerToAct()];
            assert(foldingPlayer !== null);
            this._potManager.betFolded(foldingPlayer.betSize());
            foldingPlayer.takeFromBet(foldingPlayer.betSize());
            this._players[this.playerToAct()] = null;
            this._bettingRound.actionTaken(BettingRoundAction.LEAVE);
        }
    }
    endBettingRound() {
        assert(!this._bettingRoundsCompleted, 'Betting rounds must not be completed');
        assert(!this.bettingRoundInProgress(), 'Betting round must not be in progress');
        this._potManager.collectBetsForm(this._players);
        if ((this._bettingRound?.numActivePlayers() ?? 0) <= 1) {
            this._roundOfBetting = RoundOfBetting.RIVER;
            // If there is only one pot, and there is only one player in it...
            if (this._potManager.pots().length === 1 && this._potManager.pots()[0].eligiblePlayers().length === 1) {
                // ...there is no need to deal the undealt community cards.
            }
            else {
                this.dealCommunityCards();
            }
            this._bettingRoundsCompleted = true;
            // Now you call showdown()
        }
        else if (this._roundOfBetting < RoundOfBetting.RIVER) {
            // Start the next betting round.
            this._roundOfBetting = next(this._roundOfBetting);
            this._players = this._bettingRound?.players() ?? [];
            this._bettingRound = new BettingRound([...this._players], this.nextOrWrap(this._button), this._forcedBets.blinds.big);
            this.dealCommunityCards();
            assert(!this._bettingRoundsCompleted);
        }
        else {
            assert(this._roundOfBetting === RoundOfBetting.RIVER);
            this._bettingRoundsCompleted = true;
            // Now you call showdown()
        }
    }
    winners() {
        assert(!this.handInProgress(), 'Hand must not be in progress');
        return this._winners;
    }
    showdown() {
        assert(this._roundOfBetting === RoundOfBetting.RIVER, 'Round of betting must be river');
        assert(!this.bettingRoundInProgress(), 'Betting round must not be in progress');
        assert(this.bettingRoundsCompleted(), 'Betting rounds must be completed');
        this._handInProgress = false;
        if (this._potManager.pots().length === 1 && this._potManager.pots()[0].eligiblePlayers().length === 1) {
            // No need to evaluate the hand. There is only one player.
            const index = this._potManager.pots()[0].eligiblePlayers()[0];
            const player = this._players[index];
            assert(player !== null);
            player.addToStack(this._potManager.pots()[0].size());
            return;
            // TODO: Also, no reveals in this case. Reveals are only necessary when there is >=2 players.
        }
        for (const pot of this._potManager.pots()) {
            const playerResults = pot.eligiblePlayers().map(seatIndex => {
                return [seatIndex, Hand.create(this._holeCards[seatIndex], this._communityCards)];
            });
            playerResults.sort(([, first], [, second]) => Hand.compare(first, second));
            const lastWinnerIndex = findIndexAdjacent(playerResults, ([, first], [, second]) => {
                return Hand.compare(first, second) !== 0;
            });
            const numberOfWinners = lastWinnerIndex === -1 ? playerResults.length : lastWinnerIndex + 1;
            let oddChips = pot.size() % numberOfWinners;
            const payout = (pot.size() - oddChips) / numberOfWinners;
            const winningPlayerResults = playerResults.slice(0, numberOfWinners);
            winningPlayerResults.forEach((playerResult) => {
                const [seatIndex] = playerResult;
                this._players[seatIndex]?.addToStack(payout);
            });
            this._winners.push(winningPlayerResults.map((playerResult) => {
                const [seatIndex] = playerResult;
                const holeCards = this._holeCards[seatIndex];
                return [...playerResult, holeCards];
            }));
            if (oddChips !== 0) {
                // Distribute the odd chips to the first players, counting clockwise, after the dealer button
                const winners = new Array(this._players.length).fill(null);
                winningPlayerResults.forEach((playerResult) => {
                    const [seatIndex] = playerResult;
                    winners[seatIndex] = this._players[seatIndex];
                });
                let seat = this._button;
                while (oddChips !== 0) {
                    seat = nextOrWrap(winners, seat);
                    const winner = winners[seat];
                    assert(winner !== null);
                    winner.addToStack(1);
                    oddChips--;
                }
            }
        }
    }
    nextOrWrap(seat) {
        return nextOrWrap(this._players, seat);
    }
    collectAnte() {
        if (this._forcedBets.ante === undefined) {
            return;
        }
        // Any ante goes into the pot
        let total = 0;
        for (const player of this._players) {
            if (player !== null) {
                const ante = Math.min(this._forcedBets.ante, player.totalChips());
                player.takeFromStack(ante);
                total += ante;
            }
        }
        this._potManager.pots()[0].add(total);
    }
    postBlinds() {
        let seat = this._button;
        const numPlayers = this._players.filter(player => player !== null).length;
        if (numPlayers !== 2) {
            seat = this.nextOrWrap(seat);
        }
        const smallBlind = this._players[seat];
        assert(smallBlind !== null);
        smallBlind.bet(Math.min(this._forcedBets.blinds.small, smallBlind.totalChips()));
        seat = this.nextOrWrap(seat);
        const bigBlind = this._players[seat];
        assert(bigBlind !== null);
        bigBlind.bet(Math.min(this._forcedBets.blinds.big, bigBlind.totalChips()));
        return seat;
    }
    dealHoleCards() {
        this._players.forEach((player, index) => {
            if (player !== null) {
                this._holeCards[index] = [this._deck.draw(), this._deck.draw()];
            }
        });
    }
    // Deals community cards up until the current round of betting.
    dealCommunityCards() {
        const cards = [];
        const numCardsToDeal = this._roundOfBetting - this._communityCards.cards().length;
        for (let index = 0; index < numCardsToDeal; index++) {
            cards.push(this._deck.draw());
        }
        this._communityCards.deal(cards);
    }
}
//# sourceMappingURL=dealer.js.map