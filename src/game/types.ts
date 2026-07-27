// Re-exporta tipos de cartas do dutch-mock existente para compatibilidade
export type Suit = '♠' | '♥' | '♦' | '♣';
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface CardModel {
  id: string;
  value: CardValue;
  suit: Suit;
  points: number;
  special?: 'peek' | 'swap' | 'reveal' | 'steal';
}

export type GamePhase = 'lobby' | 'memorize' | 'playing' | 'dutch-called' | 'round-end' | 'game-end';

export interface RoomSettings {
  maxPlayers: number;        // 2-6
  cardsPerPlayer: number;    // 3-6
  turnTimeSeconds: number;   // 30, 45, 60, 90
  maxScore: number;          // 50, 100, 150, 200
  specialCards: boolean;
  simultaneousDiscard: boolean;
}

export interface ServerPlayer {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  ready: boolean;
  hand: CardModel[];          // servidor conhece todas as cartas
  knownCards: number[];       // índices das cartas que o jogador já viu
  score: number;              // pontuação cumulativa através das rodadas
  connected: boolean;
}

export interface GameRoom {
  id: string;
  code: string;               // ex: 'DUTCH-K3F9'
  name: string;
  hostId: string;
  password?: string;
  settings: RoomSettings;
  players: ServerPlayer[];
  phase: GamePhase;
  deck: CardModel[];          // cartas restantes no monte de compras
  discardPile: CardModel[];   // monte de descarte (última = topo)
  currentTurnIndex: number;   // índice no array de jogadores
  dutchCallerId: string | null;
  round: number;
  turnTimer: ReturnType<typeof setTimeout> | null;
  turnStartedAt: number | null;
  createdAt: number;
}

// O que o cliente recebe (nenhuma carta secreta de outros jogadores)
export interface ClientPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  ready: boolean;
  cardsCount: number;         // quantas cartas eles têm
  score: number;
  connected: boolean;
}

export interface ClientGameState {
  phase: GamePhase;
  currentTurnPlayerId: string;
  turnTimeRemaining: number;
  deckCount: number;
  discardTop: CardModel | null;
  dutchCallerId: string | null;
  round: number;
  players: ClientPlayer[];
  yourHand: CardModel[];       // suas cartas (valor oculto a menos que seja conhecido)
  yourKnownCards: number[];    // índices que você pode ver
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  hasPassword: boolean;
  settings: RoomSettings;
  players: ClientPlayer[];
  phase: GamePhase;
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  hand: CardModel[];           // mão revelada
  handScore: number;
  bonusOrPenalty: number;      // bônus/penalidade do chamador do dutch
  roundTotal: number;
  cumulativeScore: number;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  system?: boolean;
}

// Eventos do cliente para o servidor
export interface ClientToServerEvents {
  'room:create': (data: { settings: RoomSettings; playerName: string; avatar: string; roomName: string; password?: string }) => void;
  'room:join': (data: { code: string; playerName: string; avatar: string; password?: string }) => void;
  'room:leave': () => void;
  'room:ready': (data: { ready: boolean }) => void;
  'game:start': () => void;
  'game:draw-deck': () => void;
  'game:draw-discard': () => void;
  'game:discard': (data: { cardIndex: number }) => void;
  'game:swap': (data: { handIndex: number }) => void;
  'game:use-special': (data: { kind: 'peek' | 'swap' | 'reveal' | 'steal'; targetPlayerId?: string; targetCardIndex?: number }) => void;
  'game:call-dutch': () => void;
  'game:next-round': () => void;
  'chat:message': (data: { text: string }) => void;
}

// Eventos do servidor para o cliente
export interface ServerToClientEvents {
  'room:state': (data: RoomState) => void;
  'game:state': (data: ClientGameState) => void;
  'game:card-drawn': (data: { card: CardModel; fromDeck: boolean }) => void;
  'game:special-result': (data: { kind: string; card?: CardModel; success: boolean }) => void;
  'game:dutch-called': (data: { playerId: string; playerName: string }) => void;
  'game:round-end': (data: { results: RoundResult[] }) => void;
  'game:end': (data: { results: RoundResult[]; winnerId: string }) => void;
  'chat:new': (data: ChatMessage) => void;
  'player:joined': (data: ClientPlayer) => void;
  'player:left': (data: { playerId: string }) => void;
  'error': (data: { message: string }) => void;
}
