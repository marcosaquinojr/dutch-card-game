import { CardModel, CardValue, Suit } from './types';
import * as crypto from 'crypto';

/**
 * Retorna os pontos para uma carta (A=1, 2-10=face, J=11, Q=12, K=0, JOKER=-1)
 */
export function pointsFor(value: CardValue): number {
  if (value === 'A') return 1;
  if (value === 'J') return 11;
  if (value === 'Q') return 12;
  if (value === 'K') return 0;
  if (value === 'JOKER') return -1;
  return parseInt(value, 10);
}

/**
 * Cria um baralho de 54 cartas (52 padrão + 2 coringas).
 * Se includeSpecials for verdadeiro, ~15% das cartas recebem uma habilidade especial aleatória.
 */
export function createDeck(includeSpecials: boolean): CardModel[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const specials: ('peek' | 'swap' | 'reveal' | 'steal')[] = ['peek', 'swap', 'reveal', 'steal'];
  const deck: CardModel[] = [];

  for (const suit of suits) {
    for (const value of values) {
      const card: CardModel = {
        id: crypto.randomUUID(),
        value,
        suit,
        points: pointsFor(value)
      };
      
      if (includeSpecials && Math.random() < 0.15) {
        card.special = specials[Math.floor(Math.random() * specials.length)];
      }
      
      deck.push(card);
    }
  }

  // Adiciona 2 coringas
  for (let i = 0; i < 2; i++) {
    const joker: CardModel = {
      id: crypto.randomUUID(),
      value: 'JOKER',
      suit: i === 0 ? '♠' : '♥', // apenas para ter um naipe visual
      points: pointsFor('JOKER')
    };
    if (includeSpecials && Math.random() < 0.15) {
      joker.special = specials[Math.floor(Math.random() * specials.length)];
    }
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
