import 'server-only';
import { db } from '@/lib/db';
import { dateKeyToDate, dateToKey, issueSlug, parseIssueSlug } from '@/lib/gazette/source';

const ITEM_LIST_SELECT = {
  id: true, position: true, code: true, section: true, category: true, title: true, kind: true, sourceUrl: true,
  error: true, contentFetchedAt: true,
} as const;

export type IssueSummary = { slug: string; date: string; supplement: number; number: number; itemCount: number };

function summary(i: { date: Date; supplement: number; number: number; _count: { items: number } }): IssueSummary {
  const key = dateToKey(i.date);
  return { slug: issueSlug(key, i.supplement), date: key, supplement: i.supplement, number: i.number, itemCount: i._count.items };
}

export async function listRecentIssues(limit = 30): Promise<IssueSummary[]> {
  const rows = await db.gazetteIssue.findMany({
    orderBy: [{ date: 'desc' }, { supplement: 'asc' }],
    take: limit,
    select: { date: true, supplement: true, number: true, _count: { select: { items: true } } },
  });
  return rows.map(summary);
}

export async function getLatestIssue() {
  const latest = await db.gazetteIssue.findFirst({ orderBy: [{ date: 'desc' }, { supplement: 'desc' }], select: { date: true, supplement: true } });
  return latest ? getIssue(issueSlug(dateToKey(latest.date), latest.supplement)) : null;
}

export async function getIssue(slug: string) {
  const ref = parseIssueSlug(slug);
  if (!ref) return null;
  const issue = await db.gazetteIssue.findUnique({
    where: { date_supplement: { date: dateKeyToDate(ref.date), supplement: ref.supplement } },
    include: { items: { orderBy: { position: 'asc' }, select: ITEM_LIST_SELECT } },
  });
  if (!issue) return null;
  const [prev, next, siblings] = await Promise.all([
    db.gazetteIssue.findFirst({
      where: { OR: [{ date: { lt: issue.date } }, { date: issue.date, supplement: { lt: issue.supplement } }] },
      orderBy: [{ date: 'desc' }, { supplement: 'desc' }],
      select: { date: true, supplement: true, number: true },
    }),
    db.gazetteIssue.findFirst({
      where: { OR: [{ date: { gt: issue.date } }, { date: issue.date, supplement: { gt: issue.supplement } }] },
      orderBy: [{ date: 'asc' }, { supplement: 'asc' }],
      select: { date: true, supplement: true, number: true },
    }),
    db.gazetteIssue.findMany({ where: { date: issue.date }, orderBy: { supplement: 'asc' }, select: { supplement: true } }),
  ]);
  const link = (i: { date: Date; supplement: number; number: number } | null) =>
    i ? { slug: issueSlug(dateToKey(i.date), i.supplement), date: dateToKey(i.date), supplement: i.supplement, number: i.number } : null;
  return {
    ...issue,
    slug: issueSlug(ref.date, ref.supplement),
    dateKey: ref.date,
    prev: link(prev),
    next: link(next),
    sameDay: siblings.map((s) => ({ supplement: s.supplement, slug: issueSlug(ref.date, s.supplement) })),
  };
}

export type IssueWithItems = NonNullable<Awaited<ReturnType<typeof getIssue>>>;
export type GazetteListItem = IssueWithItems['items'][number];

export async function getItem(slug: string, code: string) {
  const ref = parseIssueSlug(slug);
  if (!ref || !/^[\w-]{1,20}$/.test(code)) return null;
  const item = await db.gazetteItem.findFirst({
    where: { code, issue: { date: dateKeyToDate(ref.date), supplement: ref.supplement } },
    include: { issue: { select: { date: true, supplement: true, number: true, sourceUrl: true, pdfUrl: true } } },
  });
  if (!item || item.kind === 'ILAN') return null;
  const neighbours = await db.gazetteItem.findMany({
    where: { issueId: item.issueId, kind: { not: 'ILAN' } },
    orderBy: { position: 'asc' },
    select: { code: true, title: true, position: true },
  });
  const index = neighbours.findIndex((n) => n.code === item.code);
  return {
    ...item,
    issueSlug: issueSlug(ref.date, ref.supplement),
    dateKey: ref.date,
    prev: index > 0 ? neighbours[index - 1] : null,
    next: index >= 0 && index < neighbours.length - 1 ? neighbours[index + 1] : null,
  };
}

/** Ana sayfa için en son sayının mevzuat maddeleri. */
export async function getLatestHighlights(limit = 6) {
  const latest = await db.gazetteIssue.findFirst({
    orderBy: [{ date: 'desc' }, { supplement: 'desc' }],
    select: {
      date: true, supplement: true, number: true,
      items: { where: { kind: { not: 'ILAN' } }, orderBy: { position: 'asc' }, take: limit, select: { code: true, title: true, category: true } },
      _count: { select: { items: { where: { kind: { not: 'ILAN' } } } } },
    },
  });
  if (!latest) return null;
  const key = dateToKey(latest.date);
  return { slug: issueSlug(key, latest.supplement), date: key, supplement: latest.supplement, number: latest.number, items: latest.items, total: latest._count.items };
}

export async function listGazetteSitemap(days = 365) {
  const since = new Date(Date.now() - days * 86_400_000);
  const issues = await db.gazetteIssue.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'desc' },
    select: { date: true, supplement: true, fetchedAt: true, items: { where: { kind: { not: 'ILAN' } }, select: { code: true, contentFetchedAt: true } } },
  });
  return issues.map((i) => ({ slug: issueSlug(dateToKey(i.date), i.supplement), fetchedAt: i.fetchedAt, items: i.items }));
}

export async function gazetteAdminOverview() {
  const [issues, failed, lastFetch] = await Promise.all([
    db.gazetteIssue.findMany({
      orderBy: [{ date: 'desc' }, { supplement: 'asc' }],
      take: 21,
      select: {
        date: true, supplement: true, number: true, fetchedAt: true,
        _count: { select: { items: true } },
        items: { where: { error: { not: '' } }, select: { code: true, title: true, error: true } },
      },
    }),
    db.gazetteItem.count({ where: { error: { not: '' } } }),
    db.gazetteIssue.aggregate({ _max: { fetchedAt: true }, _count: true }),
  ]);
  return {
    issues: issues.map((i) => ({ ...summary(i), fetchedAt: i.fetchedAt, failedItems: i.items })),
    failedTotal: failed,
    lastFetchedAt: lastFetch._max.fetchedAt,
    issueCount: lastFetch._count,
  };
}
