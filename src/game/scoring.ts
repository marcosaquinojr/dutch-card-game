import { CardModel, GameRoom, RoundResult } from './types';

/**
 * Soma os pontos de todas as cartas na mão do jogador
 */
export function calculateHandScore(hand: CardModel[]): number {
  return hand.reduce((total, card) => total + card.points, 0);
}

/**
 * Calcula os resultados de cada jogador na rodada.
 * A pontuação é puramente a soma das cartas da mão (K preto = 0 pt).
 * Não há bônus ou penalidades artificiais: quem tiver a menor pontuação vence a rodada!
 */
export function calculateRoundResults(room: GameRoom): RoundResult[] {
  let minScore = Infinity;
  for (const player of room.players) {
    const score = calculateHandScore(player.hand);
    if (score < minScore) {
      minScore = score;
    }
  }

  return room.players.map((player) => {
    const handScore = calculateHandScore(player.hand);
    let reason: string | undefined;

    if (player.hand.length === 0) {
      reason = 'Descartou todas as cartas (0 pts)! ⚡';
    } else if (room.dutchCallerId === player.id) {
      if (handScore === minScore) {
        reason = 'Chamou Dutch e venceu com a menor pontuação! 🚩';
      } else {
        reason = 'Chamou Dutch, mas não teve a menor pontuação ❌';
      }
    }

    return {
      playerId: player.id,
      playerName: player.name,
      hand: player.hand,
      handScore,
      bonusOrPenalty: 0,
      roundTotal: handScore,
      cumulativeScore: player.score + handScore,
      reason,
    };
  });
}

/**
 * Verifica se algum jogador atingiu a pontuação máxima
 */
export function checkGameEnd(room: GameRoom): { ended: boolean; loserId?: string } {
  let loserId: string | undefined;
  
  for (const player of room.players) {
    if (player.score >= room.settings.maxScore) {
      if (!loserId || player.score > (room.players.find(p => p.id === loserId)?.score || 0)) {
        loserId = player.id;
      }
    }
  }
  
  return { ended: !!loserId, loserId };
}
