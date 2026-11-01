import { CapabilityCard } from './CapabilityCard.js';

import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; reason?: string; focus?: string; minutes?: number; difficulty?: string };

function loadWorkoutSuggestions() {
  const userEmail = encodeURIComponent('mona@example.com');
  return getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${userEmail}`)
    .then(({ suggestions }) => suggestions);
}

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions yet."
    loadItems={loadWorkoutSuggestions}
    renderItem={(suggestion) => <>
      <strong>{suggestion.title}</strong>
      {suggestion.reason && <span>: {suggestion.reason}</span>}
      {suggestion.minutes !== undefined && <span> ({suggestion.minutes} minutes)</span>}
    </>}
  />;
}
