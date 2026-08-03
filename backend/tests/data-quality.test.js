const { normalizeState } = require('../services/stateNormalizer');
const { extractEntities } = require('../services/entityExtraction');

describe('state normalization', () => {
  test.each([
    ['Malacca', 'Melaka'], ['Pulau Pinang', 'Penang'], ['Selangol', 'Selangor'],
    ['Sindh', 'General'], ['W.P. Kuala Lumpur', 'Kuala Lumpur'],
  ])('%s -> %s', (input, expected) => expect(normalizeState(input)).toBe(expected));
});

describe('entity extraction', () => {
  test('does not match short acronyms inside words', () => {
    const names = extractEntities('The council announced funding and launches updates.').map(item => item.name);
    expect(names).not.toContain('UN');
    expect(names).not.toContain('PAS');
  });
  test('canonicalizes aliases', () => {
    const names = extractEntities('PM Anwar met BNM officials in KL.').map(item => item.name);
    expect(names).toEqual(expect.arrayContaining(['Anwar Ibrahim', 'Bank Negara', 'Kuala Lumpur']));
  });
});
