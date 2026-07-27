export type Suit = "♠" | "♥" | "♦" | "♣";
export type CardValue = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "JOKER";

export interface CardModel {
  id: string;
  value: CardValue;
  suit: Suit;
  points: number;
  special?: "peek" | "swap" | "reveal" | "steal";
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  ready?: boolean;
  isHost?: boolean;
  cardsCount: number;
  hand: CardModel[];
  score: number;
  isYou?: boolean;
}

const AVATARS = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Dutch1&backgroundColor=1e293b",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Ace&backgroundColor=312e81",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Nova&backgroundColor=4c1d95",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Rook&backgroundColor=0c4a6e",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Ivy&backgroundColor=134e4a",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Kai&backgroundColor=581c87",
];

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const VALUES: CardValue[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function pointsFor(v: CardValue): number {
  if (v === "A") return 1;
  if (v === "J") return 11;
  if (v === "Q") return 12;
  if (v === "K") return 0; // Dutch: K = 0
  if (v === "JOKER") return -1;
  return parseInt(v, 10);
}

let __id = 0;
export function makeCard(v: CardValue, s: Suit, special?: CardModel["special"]): CardModel {
  return { id: `c${++__id}`, value: v, suit: s, points: pointsFor(v), special };
}

export function randomCard(): CardModel {
  const v = VALUES[Math.floor(Math.random() * VALUES.length)];
  const s = SUITS[Math.floor(Math.random() * SUITS.length)];
  const special = Math.random() < 0.15
    ? (["peek", "swap", "reveal", "steal"] as const)[Math.floor(Math.random() * 4)]
    : undefined;
  return makeCard(v, s, special);
}

export function mockHand(size: number): CardModel[] {
  return Array.from({ length: size }, () => randomCard());
}

export const MOCK_PLAYERS: Player[] = [
  { id: "p1", name: "Você", avatar: AVATARS[0], isYou: true, isHost: true, ready: true, cardsCount: 4, hand: mockHand(4), score: 12 },
  { id: "p2", name: "Larissa", avatar: AVATARS[1], ready: true, cardsCount: 4, hand: mockHand(4), score: 18 },
  { id: "p3", name: "Rafael", avatar: AVATARS[2], ready: false, cardsCount: 4, hand: mockHand(4), score: 7 },
  { id: "p4", name: "Nina", avatar: AVATARS[3], ready: true, cardsCount: 4, hand: mockHand(4), score: 25 },
  { id: "p5", name: "Diego", avatar: AVATARS[4], ready: true, cardsCount: 4, hand: mockHand(4), score: 30 },
  { id: "p6", name: "Aurora", avatar: AVATARS[5], ready: false, cardsCount: 4, hand: mockHand(4), score: 4 },
];

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  system?: boolean;
}

export const MOCK_CHAT: ChatMessage[] = [
  { id: "m1", author: "system", text: "Sala criada. Aguardando jogadores…", time: "20:14", system: true },
  { id: "m2", author: "Larissa", text: "Boa noite pessoal 👋", time: "20:15" },
  { id: "m3", author: "Rafael", text: "Vamos que vamos", time: "20:16" },
  { id: "m4", author: "Você", text: "Bora! Boa sorte a todos", time: "20:17" },
];
