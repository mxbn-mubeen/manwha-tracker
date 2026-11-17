import { createTRPCRouter, publicProcedure } from '../../trpc';
import { ManhwaService } from '../manhwa/manhwa.service';
import { db, sources } from '@manhwa-tracker/database';
import { sql } from 'drizzle-orm';

export const statsRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const manhwaService = new ManhwaService();
    // Pass the requesting user's ID so progress (lastChapter, unread) is scoped to them.
    // For guests (no userId), no personal progress is attached — unread = 0 for everyone.
    const allManhwa = await manhwaService.getAll(ctx.userId);

    let totalTrackedChapters = 0;
    let totalUnreadChapters = 0;
    const statusCounts = {
      ongoing: 0,
      completed: 0,
      hiatus: 0,
      dropped: 0
    };

    const sortedByLength = [...allManhwa]
      .filter(m => m.progress?.isTracking)
      .sort((a, b) => {
      const aChapters = a.progress?.latestChapter ?? 0;
      const bChapters = b.progress?.latestChapter ?? 0;
      return bChapters - aChapters;
    });

    const longestSeries = sortedByLength.slice(0, 5).map(m => ({
      id: m.id,
      title: m.title,
      chapters: m.progress?.latestChapter ?? 0,
      coverUrl: m.coverUrl
    }));

    for (const manhwa of allManhwa) {
      // Status breakdown
      if (manhwa.status in statusCounts) {
        statusCounts[manhwa.status as keyof typeof statusCounts]++;
      }

      // Chapter counts — only include manhwa the user is actively tracking.
      // For a new user with no tracked manhwa, isTracking is false → skipped.
      // For guests (no userId), progress.isTracking is always false → all skipped.
      if (!manhwa.progress?.isTracking) continue;

      const latest = manhwa.progress?.latestChapter ?? 0;
      const read = manhwa.progress?.lastChapter ?? 0;
      
      totalTrackedChapters += latest;
      
      if (manhwa.status !== 'completed') {
        const unread = Math.max(0, latest - read);
        totalUnreadChapters += unread;
      }
    }

    // Source distribution (direct DB query for efficiency)
    const sourceRows = await db
      .select({
        type: sources.type,
        count: sql<number>`count(*)::int`,
      })
      .from(sources)
      .groupBy(sources.type);

    const sourceDistribution = {
      website: 0,
      telegram: 0,
    };
    for (const row of sourceRows) {
      if (row.type === 'website') sourceDistribution.website = row.count;
      if (row.type === 'telegram') sourceDistribution.telegram = row.count;
    }

    const userTracked = allManhwa.filter(m => m.progress?.isTracking);

    return {
      totalManhwa: ctx.userId ? userTracked.length : allManhwa.length,
      totalCatalog: allManhwa.length,
      totalTracked: userTracked.length,
      totalTrackedChapters,
      totalUnreadChapters,
      statusCounts,
      sourceDistribution,
      longestSeries,
    };
  }),
});
