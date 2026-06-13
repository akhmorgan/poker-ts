import assert from 'assert';
import Card, { CardRank } from './card';
import { findIndexAdjacent, findMax, rotate, unique } from '../util/array';
export var HandRanking;
(function (HandRanking) {
    HandRanking[HandRanking["HIGH_CARD"] = 0] = "HIGH_CARD";
    HandRanking[HandRanking["PAIR"] = 1] = "PAIR";
    HandRanking[HandRanking["TWO_PAIR"] = 2] = "TWO_PAIR";
    HandRanking[HandRanking["THREE_OF_A_KIND"] = 3] = "THREE_OF_A_KIND";
    HandRanking[HandRanking["STRAIGHT"] = 4] = "STRAIGHT";
    HandRanking[HandRanking["FLUSH"] = 5] = "FLUSH";
    HandRanking[HandRanking["FULL_HOUSE"] = 6] = "FULL_HOUSE";
    HandRanking[HandRanking["FOUR_OF_A_KIND"] = 7] = "FOUR_OF_A_KIND";
    HandRanking[HandRanking["STRAIGHT_FLUSH"] = 8] = "STRAIGHT_FLUSH";
    HandRanking[HandRanking["ROYAL_FLUSH"] = 9] = "ROYAL_FLUSH";
})(HandRanking || (HandRanking = {}));
export default class Hand {
    constructor(ranking, strength, cards) {
        assert(cards.length === 5);
        this._cards = cards;
        this._ranking = ranking;
        this._strength = strength;
    }
    static create(holeCards, communityCards) {
        assert(communityCards.cards().length === 5, 'All community cards must be dealt');
        const cards = [
            ...holeCards,
            ...communityCards.cards(),
        ];
        return Hand.of(cards);
    }
    static of(cards) {
        assert(cards.length === 7);
        const hand1 = Hand._highLowHandEval(cards);
        const hand2 = Hand._straightFlushEval(cards);
        if (hand2 !== null) {
            return findMax([hand1, hand2], Hand.compare);
        }
        return hand1;
    }
    static compare(h1, h2) {
        const rankingDiff = h2.ranking() - h1.ranking();
        if (rankingDiff !== 0) {
            return rankingDiff;
        }
        return h2.strength() - h1.strength();
    }
    static nextRank(cards) {
        assert(cards.length !== 0);
        const firstRank = cards[0].rank;
        const secondRankIndex = cards.findIndex(card => card.rank !== firstRank);
        return {
            rank: firstRank,
            count: secondRankIndex !== -1 ? secondRankIndex : cards.length,
        };
    }
    static getStrength(cards) {
        assert(cards.length === 5);
        let sum = 0;
        let multiplier = Math.pow(13, 4);
        for (;;) {
            const { rank, count } = this.nextRank(cards);
            sum += multiplier * rank;
            cards = cards.slice(count);
            if (cards.length !== 0) {
                multiplier /= 13;
            }
            else {
                break;
            }
        }
        return sum;
    }
    // If there are >=5 cards with the same suit, return a span containing all of
    // them.
    static getSuitedCards(cards) {
        assert(cards.length === 7);
        cards.sort(Card.compare);
        let first = 0;
        for (;;) {
            let last = cards.slice(first + 1).findIndex(card => card.suit !== cards[first].suit);
            if (last === -1) {
                last = cards.length;
            }
            else {
                last += first + 1;
            }
            if (last - first >= 5) {
                return cards.slice(first, last);
            }
            else if (last === cards.length) {
                return null;
            }
            first = last;
        }
    }
    // EXPECTS: 'cards' is a descending range of cards with unique ranks.
    // Returns the subrange which contains the cards forming a straight. Ranks of
    // cards in the resulting range are r, r-1, r-2... except for the wheel.
    static getStraightCards(cards) {
        assert(cards.length >= 5);
        let first = 0;
        for (;;) {
            let last = findIndexAdjacent(cards.slice(first), (c1, c2) => c1.rank !== c2.rank + 1);
            if (last === -1) {
                last = cards.length;
            }
            else {
                last += first + 1;
            }
            if (last - first >= 5) {
                return cards.slice(first, first + 5);
            }
            else if (last - first === 4) {
                if (cards[first].rank === CardRank._5 && cards[0].rank === CardRank.A) {
                    rotate(cards, first);
                    return cards.slice(0, 5);
                }
            }
            else if (cards.length - last < 4) {
                return null;
            }
            first = last;
        }
    }
    static _highLowHandEval(cards /* size = 7 */) {
        assert(cards.length === 7);
        cards = [...cards];
        const rankOccurrences = new Array(13).fill(0);
        for (const card of cards) {
            rankOccurrences[card.rank] += 1;
        }
        cards.sort((c1, c2) => {
            if (rankOccurrences[c1.rank] === rankOccurrences[c2.rank]) {
                return c2.rank - c1.rank;
            }
            return rankOccurrences[c2.rank] - rankOccurrences[c1.rank];
        });
        let ranking;
        const { count } = Hand.nextRank(cards);
        if (count === 4) {
            cards = [
                ...cards.slice(0, 4),
                ...cards.slice(5).sort((c1, c2) => c2.rank - c1.rank),
            ];
            ranking = HandRanking.FOUR_OF_A_KIND;
        }
        else if (count === 3) {
            const tmp = Hand.nextRank(cards.slice(-4));
            if (tmp.count === 2) {
                ranking = HandRanking.FULL_HOUSE;
            }
            else {
                ranking = HandRanking.THREE_OF_A_KIND;
            }
        }
        else if (count === 2) {
            const tmp = Hand.nextRank(cards.slice(-5));
            if (tmp.count === 2) {
                ranking = HandRanking.TWO_PAIR;
            }
            else {
                ranking = HandRanking.PAIR;
            }
        }
        else {
            ranking = HandRanking.HIGH_CARD;
        }
        const handCards = cards.slice(0, 5);
        const strength = Hand.getStrength(handCards);
        return new Hand(ranking, strength, handCards);
    }
    static _straightFlushEval(cards) {
        assert(cards.length === 7);
        cards = [...cards];
        const suitedCards = Hand.getSuitedCards(cards);
        if (suitedCards !== null) {
            const straightCards = this.getStraightCards(suitedCards);
            if (straightCards !== null) {
                let ranking;
                let strength;
                if (straightCards[0].rank === CardRank.A) {
                    ranking = HandRanking.ROYAL_FLUSH;
                    strength = 0;
                }
                else {
                    ranking = HandRanking.STRAIGHT_FLUSH;
                    strength = straightCards[0].rank;
                }
                const handCards = straightCards.slice(0, 5);
                return new Hand(ranking, strength, handCards);
            }
            else {
                const ranking = HandRanking.FLUSH;
                const handCards = suitedCards.slice(0, 5);
                const strength = this.getStrength(handCards);
                return new Hand(ranking, strength, handCards);
            }
        }
        else {
            cards.sort((c1, c2) => c2.rank - c1.rank);
            cards = unique(cards, (c1, c2) => c1.rank !== c2.rank);
            if (cards.length < 5) {
                return null;
            }
            else {
                const straightCards = this.getStraightCards(cards);
                if (straightCards !== null) {
                    const ranking = HandRanking.STRAIGHT;
                    const strength = straightCards[0].rank;
                    return new Hand(ranking, strength, straightCards);
                }
            }
        }
        return null;
    }
    ranking() {
        return this._ranking;
    }
    strength() {
        return this._strength;
    }
    cards() {
        return this._cards;
    }
}
//# sourceMappingURL=hand.js.map