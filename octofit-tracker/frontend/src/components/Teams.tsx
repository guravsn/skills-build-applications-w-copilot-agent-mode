import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; members?: unknown[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => {
        if (isMounted) setTeams(result);
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {hasError ? (
          <p role="alert">Unable to load teams.</p>
        ) : teams === null ? (
          <p role="status">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p>No teams yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {teams.map((team, index) => (
              <li className="list-group-item" key={`${team.name}-${index}`}>
                <strong>{team.name}</strong>
                <span className="ms-2 text-body-secondary">
                  {team.members?.length ?? 0} members
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
