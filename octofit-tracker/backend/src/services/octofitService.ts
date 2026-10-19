import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity details are required'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Activity details are invalid'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 400 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team details are required'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof mascot !== 'string' || mascot.trim().length === 0 ||
    !Array.isArray(members)
  ) {
    throw Object.assign(new Error('Team details are invalid'), { status: 400 });
  }

  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);

  const pointsByTeam = new Map<string, number>();
  for (const total of totals) pointsByTeam.set(total._id.toString(), total.totalPoints);

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((first, second) => second.totalPoints - first.totalPoints)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(_userEmail: string) {
  const user = await User.findOne({ email: _userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).select('type').lean(),
    Workout.find().lean(),
  ]);
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
  };
  const recentTypes = [...new Set(activities.map(({ type }) => type.toLowerCase()))];
  const goal = user.fitnessGoal.toLowerCase();

  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const recentType = recentTypes.find((type) => (activityFocus[type] ?? type) === focus);
      const matchesGoal = focus === goal;
      const reason = matchesGoal
        ? recentType
          ? `Matches your ${user.fitnessGoal} goal and recent ${recentType} activity.`
          : `Matches your ${user.fitnessGoal} goal.`
        : recentType
          ? `Recommended based on your recent ${recentType} activity.`
          : 'Suggested for balanced training.';
      return { ...workout, reason, relevance: (matchesGoal ? 2 : 0) + (recentType ? 1 : 0) };
    })
    .sort((first, second) => second.relevance - first.relevance)
    .map(({ relevance: _relevance, ...workout }) => workout);
}

export { User };
