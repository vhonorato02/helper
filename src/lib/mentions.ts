// Parse @mentions from comment bodies.
// Pattern: @ followed by 2-30 chars of [a-z0-9._-], case-insensitive on input
// but usernames are stored lowercase, so we normalize.

const MENTION_RE = /(^|\s)@([a-z0-9._-]{2,30})\b/gi;

export function extractMentions(body: string): string[] {
  const set = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    set.add(match[2].toLowerCase());
  }
  return [...set];
}

export interface MentionSegment {
  type: 'text' | 'mention';
  value: string;
}

export function tokenizeMentions(body: string, validUsernames: ReadonlySet<string>): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const match of body.matchAll(MENTION_RE)) {
    const username = match[2].toLowerCase();
    if (!validUsernames.has(username)) continue;
    const matchStart = match.index! + match[1].length;
    if (matchStart > cursor) {
      segments.push({ type: 'text', value: body.slice(cursor, matchStart) });
    }
    segments.push({ type: 'mention', value: username });
    cursor = matchStart + 1 + username.length; // skip past @username
  }
  if (cursor < body.length) {
    segments.push({ type: 'text', value: body.slice(cursor) });
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: body }];
}
