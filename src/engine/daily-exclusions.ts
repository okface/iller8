/**
 * Phrase ids quarantined from DAILY practice — contrived developer jargon the
 * owner (not a developer) doesn't want in rotation. Lesson 5 stays playable in
 * lesson mode; these are only filtered out of the unified daily session.
 */
export const DAILY_EXCLUDED_PHRASE_IDS = new Set<string>([
  'imam-bag', 'radi-na-mom', 'ko-je-ovo-pisao',
  'pustam-deploy', 'ne-diraj-petkom', 'pukao-prod', 'rollback',
  'radim-na-tiketu', 'blokiram-se', 'opet-meeting',
  'radi-li-ti-ovo', 'probaj-sad', 'ne-radi-opet',
  'erp-opet-pao', 'migracija-podataka', 'ko-je-menjao-semu', 'pim-integracija',
  'pustam-pr', 'vidimo-se-sutra', 'ubija-me-ovaj-task',
]);

export function isDailyExcluded(id: string): boolean {
  return DAILY_EXCLUDED_PHRASE_IDS.has(id);
}
