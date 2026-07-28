import { CardModel, CardValue, Suit } from './types';
import * as crypto from 'crypto';

/**
 * Retorna os pontos para uma carta no Dutch:
 * - Ás (A) = 1 pt
 * - 2 a 10 = valor da carta
 * - Valete (J) = 11 pt
 * - Dama (Q) = 12 pt
 * - Reis Pretos (K♠, K♣) = -1 pt!
 * - Reis Vermelhos (K♥, K♦) = 13 pt
 * - Coringa = -1 pt
 */
export function pointsFor(value: CardValue, suit?: Suit): number {
  if (value === 'A') return 1;
  if (value === 'J') return 11;
  if (value === 'Q') return 12;
  if (value === 'K') {
    if (suit === '♠' || suit === '♣') return -1;
    return 13;
  }
  if (value === 'JOKER') return -1;
  return parseInt(value, 10);
}

/**
 * Cria um baralho de 54 cartas (52 padrão + 2 coringas) com regras clássicas do Dutch.
 */
export function createDeck(includeSpecials: boolean): CardModel[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: CardModel[] = [];

  for (const suit of suits) {
    for (const value of values) {
      const card: CardModel = {
        id: crypto.randomUUID(),
        value,
        suit,
        points: pointsFor(value, suit),
      };
      
      // Regras de habilidades de descarte do Dutch:
      if (value === 'Q') {
        card.special = 'peek'; // Dama: olhar uma carta sua
      } else if (value === 'J') {
        card.special = 'swap'; // Valete: trocar 2 cartas na mesa
      }
      
      deck.push(card);
    }
  }

  // Adiciona 2 coringas (-1 pt)
  for (let i = 0; i < 2; i++) {
    const joker: CardModel = {
      id: crypto.randomUUID(),
      value: 'JOKER',
      suit: i === 0 ? '♠' : '♥',
      points: pointsFor('JOKER'),
    };
    deck.push(joker);
  }

  return deck;
}

/**
 * Embaralha o baralho usando o algoritmo de Fisher-Yates e retorna um novo array.
 */
export function shuffleDeck(deck: CardModel[]): CardModel[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Distribui as cartas do baralho para cada jogador.
 */
export function dealCards(deck: CardModel[], playerCount: number, cardsPerPlayer: number): { hands: CardModel[][]; remainingDeck: CardModel[] } {
  const hands: CardModel[][] = Array.from({ length: playerCount }, () => []);
  const remainingDeck = [...deck];

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remainingDeck.pop();
      if (card) {
        hands[p].push(card);
      }
    }
  }

  return { hands, remainingDeck };
}
