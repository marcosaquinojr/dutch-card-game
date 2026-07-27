import { CardModel, GameRoom, RoundResult } from './types';

/**
 * Soma os pontos de todas as cartas na mão do jogador
 */
export function calculateHandScore(hand: CardModel[]): number {
  return hand.reduce((total, card) => total + card.points, 0);
}

/**
 * Aplica o bônus ou penalidade para o jogador que chamou Dutch
 * Se ele tem a menor pontuação, ganha -5 de bônus. Se não, recebe +10 de penalidade.
 */
export function applyDutchBonus(results: RoundResult[], dutchCallerId: string | null): RoundResult[] {
  if (!dutchCallerId) return results;

  let minScore = Infinity;
  let callerScore = Infinity;
  
  for (const r of results) {
    if (r.handScore < minScore) {
      minScore = r.handScore;
    }
    if (r.playerId === dutchCallerId) {
      callerScore = r.handScore;
    }
  }

  // Se empatou com a menor pontuação mas não é único, a regra pode variar, 
  // mas vamos assumir que ele tem que ter a menor pontuação igual a minScore
  // e se outro também tem minScore, ainda conta como sucesso, ou apenas se for estritamente menor?
  // Normalmente, o chamador precisa ter a menor pontuação da mesa.
  // Vamos assumir <= minScore. Como callerScore >= minScore sempre,
  // callerScore === minScore significa que ele tem a menor.
  const success = callerScore === minScore;

  return results.map(r => {
    if (r.playerId === dutchCallerId) {
      const bonusOrPenalty = success ? -5 : 10;
      return {
        ...r,
        bonusOrPenalty,
        roundTotal: r.handScore + bonusOrPenalty,
        cumulativeScore: r.cumulativeScore - r.handScore + (r.handScore + bonusOrPenalty)
      };
    }
    return r;
  });
}

/**
 * Calcula os resultados de cada jogador na rodada
 */
export function calculateRoundResults(room: GameRoom): RoundResult[] {
  const initialResults: RoundResult[] = room.players.map(player => {
    const handScore = calculateHandScore(player.hand);
    return {
      playerId: player.id,
      playerName: player.name,
      hand: player.hand,
      handScore,
      bonusOrPenalty: 0,
      roundTotal: handScore,
      cumulativeScore: player.score + handScore
    };
  });

  return applyDutchBonus(initialResults, room.dutchCallerId);
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
