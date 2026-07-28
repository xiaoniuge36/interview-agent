import { recommendationCandidates } from './practice-recommendation-context';

test('does not recommend a high-mastery tag as a weakness', () => {
  const candidates = recommendationCandidates({
    job: null,
    profile: null,
    mastery: [
      { tag: 'system-design', score: 92 },
      { tag: 'observability', score: 44 },
    ],
    recentItems: [],
  });

  expect(candidates).not.toContainEqual(expect.objectContaining({ weakTag: 'system-design' }));
  expect(candidates).toContainEqual(expect.objectContaining({ weakTag: 'observability' }));
});
