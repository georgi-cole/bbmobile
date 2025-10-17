/**
 * Normalized competition result contracts
 * Used by all competition types: HOH, POV (Veto), and other competitions
 */

/**
 * Competition type discriminator
 */
export type CompetitionKind = 'HOH' | 'POV' | 'OTHER';

/**
 * Participant in a competition with their final score
 */
export interface CompetitionParticipant {
  id: number | string;
  score: number;
  name?: string;
}

/**
 * Normalized competition result contract
 * This contract is used by all competition types to ensure consistency
 * 
 * @property kind - Type of competition
 * @property winnerId - ID of the competition winner (required)
 * @property finalists - Optional array of top performers (typically top 3)
 * @property participants - Optional full list of all participants
 * @property metadata - Optional additional competition-specific data
 */
export interface CompetitionResult {
  kind: CompetitionKind;
  winnerId: number | string;
  finalists?: CompetitionParticipant[];
  participants?: CompetitionParticipant[];
  metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if a value is a valid CompetitionResult
 */
export function isCompetitionResult(value: unknown): value is CompetitionResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const result = value as CompetitionResult;
  
  // Required fields
  if (!result.kind || !['HOH', 'POV', 'OTHER'].includes(result.kind)) {
    return false;
  }
  
  if (result.winnerId === undefined || result.winnerId === null) {
    return false;
  }
  if (typeof result.winnerId !== 'number' && typeof result.winnerId !== 'string') {
    return false;
  }
  
  // Optional arrays validation
  if (result.finalists !== undefined && !Array.isArray(result.finalists)) {
    return false;
  }
  
  if (result.participants !== undefined && !Array.isArray(result.participants)) {
    return false;
  }
  
  return true;
}

/**
 * Helper to create a normalized competition result
 */
export function createCompetitionResult(
  kind: CompetitionKind,
  winnerId: number | string,
  options: {
    finalists?: CompetitionParticipant[];
    participants?: CompetitionParticipant[];
    metadata?: Record<string, unknown>;
  } = {}
): CompetitionResult {
  return {
    kind,
    winnerId,
    finalists: options.finalists,
    participants: options.participants,
    metadata: options.metadata
  };
}
