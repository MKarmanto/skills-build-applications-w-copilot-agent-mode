import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function validationError(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const userId = typeof body.userId === 'string' ? body.userId : undefined;
  const teamId = typeof body.teamId === 'string' ? body.teamId : undefined;
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const minutesValue = Number(body.minutes);

  if (!userId || !teamId || !type || !Number.isFinite(minutesValue) || minutesValue <= 0) {
    throw validationError('Activity validation failed');
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw validationError('User and team IDs must be valid Mongo ObjectIds');
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);

  if (!userExists || !teamExists) {
    throw validationError('User and team must both exist');
  }

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes: minutesValue,
    points: minutesValue,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  const membersValue = Array.isArray(body.members) ? body.members : [];

  if (!name || !mascot) {
    throw validationError('Team name and mascot are required');
  }

  const normalizedMembers = membersValue
    .map((member) => (typeof member === 'string' ? member : String(member)))
    .filter((member) => mongoose.Types.ObjectId.isValid(member));

  const team = await Team.create({
    name,
    mascot,
    members: normalizedMembers,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const teams = await Team.find().lean();
  const teamSummaries = await Promise.all(
    teams.map(async (team) => {
      const totalPoints = await Activity.aggregate([
        { $match: { team: new mongoose.Types.ObjectId(team._id.toString()) } },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]).then((result) => result[0]?.totalPoints ?? 0);

      return {
        teamId: team._id,
        teamName: team.name,
        totalPoints,
      };
    }),
  );

  return teamSummaries
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({
      teamName: entry.teamName,
      totalPoints: entry.totalPoints,
      rank: index + 1,
    }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    throw validationError('User email is required');
  }

  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentFocus = recentActivity[0]?.type
    ? (() => {
        switch (recentActivity[0].type.toLowerCase()) {
          case 'run':
            return 'endurance';
          case 'strength':
            return 'strength';
          case 'cycle':
            return 'endurance';
          default:
            return 'endurance';
        }
      })()
    : undefined;

  const preferredFocus = (user.fitnessGoal as string | undefined)?.trim().toLowerCase() || recentFocus || 'endurance';

  const suggestions = await Workout.find({ focus: preferredFocus }).lean();
  const fallbackSuggestions = await Workout.find().lean();
  const rankedSuggestions = (suggestions.length ? suggestions : fallbackSuggestions)
    .map((suggestion) => ({
      ...suggestion,
      reason: `Based on your ${recentActivity[0]?.type ?? user.fitnessGoal ?? 'activity'} activity, this ${suggestion.focus} workout matches your current routine.`,
    }))
    .sort((a, b) => {
      const aMatch = a.focus === preferredFocus ? 1 : 0;
      const bMatch = b.focus === preferredFocus ? 1 : 0;
      return bMatch - aMatch;
    });

  return rankedSuggestions.slice(0, 3);
}

export { User };
