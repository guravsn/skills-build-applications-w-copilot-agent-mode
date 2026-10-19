import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities: result }) => {
        if (isMounted) setActivities(result);
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {hasError ? (
          <p role="alert">Unable to load activities.</p>
        ) : activities === null ? (
          <p role="status">Loading activities...</p>
        ) : activities.length === 0 ? (
          <p>No activities yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {activities.map((activity, index) => (
              <li className="list-group-item" key={`${activity.type}-${index}`}>
                <strong>{activity.type}</strong>: {activity.minutes} minutes, {activity.points} points
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
