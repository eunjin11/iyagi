import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const argInput = process.argv[2];
const inputPath = path.resolve(projectRoot, argInput || 'scenario/isekai_jeonhanim.html');
const currentPath = path.resolve(projectRoot, 'src/story/current.ts');

function slugify(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function decodeEntities(str) {
  return String(str)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAttr(tag, attr) {
  const m = new RegExp(`${attr}="([^"]*)"`, 'i').exec(tag);
  return m ? m[1] : '';
}

function parseLinks(text) {
  // Matches [[Display|Target]], [[Display->Target]], [[Target]]
  const choices = [];
  let clean = text;
  // First handle triple-bracket links [[[...]]]
  const tripleRegex = /\[\[\[([^[\]]+)\]\]\]/g;
  for (const match of clean.matchAll(tripleRegex)) {
    const rawInner = match[1].trim();
    const raw = decodeEntities(rawInner);
    let display = raw;
    let target = raw;
    if (raw.includes('|')) {
      const [d, t] = raw.split('|');
      display = d.trim();
      target = t.trim();
    } else if (raw.includes('->') || raw.includes('→')) {
      const sep = raw.includes('->') ? '->' : '→';
      const [d, t] = raw.split(sep);
      display = d.trim();
      target = t.trim();
    } else if (raw.includes('<-')) {
      const [t, d] = raw.split('<-');
      display = d.trim();
      target = t.trim();
    }
    choices.push({ text: display, targetRaw: target });
    clean = clean.replace(match[0], '');
  }
  const linkRegex = /\[\[([^[\]]+)\]\]/g;
  for (const match of clean.matchAll(linkRegex)) {
    const rawInner = match[1].trim();
    const raw = decodeEntities(rawInner);
    let display = raw;
    let target = raw;
    if (raw.includes('|')) {
      const [d, t] = raw.split('|');
      display = d.trim();
      target = t.trim();
    } else if (raw.includes('->') || raw.includes('→')) {
      const sep = raw.includes('->') ? '->' : '→';
      const [d, t] = raw.split(sep);
      display = d.trim();
      target = t.trim();
    } else if (raw.includes('<-')) {
      const [t, d] = raw.split('<-');
      display = d.trim();
      target = t.trim();
    }
    choices.push({ text: display, targetRaw: target });
    // Remove link markup from the narrative text entirely (choices will render separately)
    clean = clean.replace(match[0], '');
  }
  return { text: clean, choices };
}

function stripChoiceDisplayLines(text, choices) {
  if (!choices || choices.length === 0) return text;
  const choiceSet = new Set(choices.map((c) => String(c.text || '').trim()));
  const lines = String(text).split(/\r?\n/);
  const filtered = lines.filter((line) => !choiceSet.has(String(line).trim()));
  return filtered.join('\n');
}

function parseSetEffectsFromText(text) {
  // Supports forms: (set:$var=NUMBER), (set:$var=true/false), (set:$var=$var+N), (set:$var=$var-N)
  const effects = [];
  let clean = text;
  const setRegex =
    /\(set:\s*\$?([a-zA-Z0-9_]+)\s*(?:=|to)\s*(?:\$?([a-zA-Z0-9_]+)\s*([+\-])\s*([0-9]+)|([0-9]+)|true|false|"(.*?)"|'(.*?)')\s*\)/gi;
  clean = clean.replace(setRegex, (_m, key, key2, op, num, litNum, litStrD, litStrS) => {
    if (key2 && op && num) {
      const by = Number(num);
      effects.push({ type: op === '+' ? 'inc' : 'dec', key, by });
    } else if (typeof litNum !== 'undefined' && litNum !== null) {
      effects.push({ type: 'set', key, value: Number(litNum) });
    } else {
      // booleans or strings
      const lower = (_m.match(/\s(true|false)\s*\)/i)?.[1] || '').toLowerCase();
      if (lower === 'true' || lower === 'false') {
        effects.push({ type: 'set', key, value: lower === 'true' });
      } else {
        const sval = litStrD ?? litStrS ?? '';
        effects.push({ type: 'set', key, value: sval });
      }
    }
    return ''; // strip out (set:...) from text
  });
  return { text: clean, effects };
}

function parseClickBlocks(text) {
  // Pattern like:
  // [Label]<hook|
  // (click: ?hook)[ (set:...) (go-to:"Target") or [[Display->Target]] ]
  const choices = [];
  let clean = text;
  const labelRegex = /\[([^\]]+?)\]<\s*([a-zA-Z0-9_]+)\s*\|/gi;
  // Collect labels first
  const labels = [];
  for (const m of clean.matchAll(labelRegex)) {
    labels.push({ full: m[0], text: decodeEntities(m[1].trim()), hook: m[2] });
  }
  // Remove labels from text (we will render as choices)
  clean = clean.replace(labelRegex, '');
  // For each label, find corresponding click block
  for (const { text: labelText, hook } of labels) {
    const clickRegex = new RegExp(`\\(click:\\s*\\?${hook}\\)\\s*\\[([\\s\\S]*?)\\]`, 'i');
    const m = clickRegex.exec(clean);
    if (!m) continue;
    const inner = m[1];
    // Parse effects inside
    const setParsed = parseSetEffectsFromText(inner);
    const innerAfterSet = setParsed.text;
    // Prefer go-to
    const goToMatch = /\(go-to:\s*"([^"]+)"\s*\)/i.exec(innerAfterSet);
    let targetRaw = goToMatch ? decodeEntities(goToMatch[1]) : '';
    // Or a link inside
    if (!targetRaw) {
      const linkInside = parseLinks(innerAfterSet);
      if (linkInside.choices.length > 0) {
        targetRaw = linkInside.choices[0].targetRaw || '';
      }
    }
    // Create a choice with do effects
    if (targetRaw) {
      choices.push({
        text: labelText.replace(/^"(.*)"$/, '$1'),
        targetRaw,
        do: setParsed.effects
      });
    }
    // Strip this click block from text
    clean = clean.replace(clickRegex, '');
  }
  return { text: clean, choices };
}

function splitTopLevel(src, sep) {
  const result = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && src.slice(i, i + sep.length).toLowerCase() === sep) {
      result.push(buf.trim());
      buf = '';
      i += sep.length - 1;
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== '') result.push(buf.trim());
  return result;
}

function parseSingleCondition(src) {
  const trimmed = src.trim().replace(/^\((.*)\)$/, '$1').trim();
  const m = /\s*\$([a-zA-Z0-9_]+)\s*(>=|<=|>|<|is not|is|==|!=)\s*(true|false|[0-9]+)\s*$/i.exec(trimmed);
  if (m) {
    const key = m[1];
    const op = m[2].toLowerCase();
    const rhs = m[3].toLowerCase();
    if (op === 'is' || op === '==') {
      if (rhs === 'true' || rhs === 'false') {
        return { key, op: 'eq', value: rhs === 'true' };
      }
      return { key, op: 'eq', value: Number(rhs) };
    }
    if (op === 'is not' || op === '!=') {
      if (rhs === 'true' || rhs === 'false') {
        return { key, op: 'neq', value: rhs === 'true' };
      }
      return { key, op: 'neq', value: Number(rhs) };
    }
    const map = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' };
    const cmp = map[op] || 'eq';
    const value = rhs === 'true' || rhs === 'false' ? (rhs === 'true') : Number(rhs);
    return { key, op: cmp, value };
  }
  const m2 = /\s*\$([a-zA-Z0-9_]+)\s*$/i.exec(trimmed);
  if (m2) return { key: m2[1], op: 'truthy' };
  return null;
}

function parseConditionGroups(src) {
  // Build groups considering AND/OR, allowing OR inside parentheses too.
  const andParts = splitTopLevel(src, ' and ');
  let groups = [[]]; // array of arrays of conditions
  for (const part of andParts) {
    // Allow OR alternatives inside this AND part
    const orParts = part.split(/\s+or\s+/i);
    const altConds = [];
    for (const alt of orParts) {
      const c = parseSingleCondition(alt);
      if (c) altConds.push(c);
    }
    if (altConds.length === 0) continue;
    // Expand groups by combining with each alternative (OR)
    const nextGroups = [];
    for (const g of groups) {
      for (const c of altConds) {
        nextGroups.push([...g, c]);
      }
    }
    groups = nextGroups;
  }
  // If nothing parsed, return empty
  if (groups.length === 1 && groups[0].length === 0) return [];
  return groups;
}

function parseIfBlocks(text) {
  // (if: CONDITION)[ CONTENT ]
  // We'll support condition of form: $var >= N, $var > N, $var <= N, $var < N, $var is true/false, $var is not true/false
  const choices = [];
  let clean = text;
  const ifRegex = /\(if:\s*([^)]+?)\s*\)\s*\[([\s\S]*?)\]/gi;
  const dangling = [];
  clean = clean.replace(ifRegex, (_m, condSrc, block) => {
    const cond = String(condSrc).trim();
    const groups = parseConditionGroups(cond);
    // Inside block may contain links or go-to
    const goToMatch = /\(go-to:\s*"([^"]+)"\s*\)/i.exec(block);
    if (goToMatch) {
      const target = decodeEntities(goToMatch[1]);
      const choice = { text: target, targetRaw: target };
      if (groups.length > 1) choice.ifAny = groups;
      else if (groups.length === 1) choice.if = groups[0];
      choices.push(choice);
    }
    const parsedLinks = parseLinks(block);
    for (const c of parsedLinks.choices) {
      const choice = { ...c };
      if (groups.length > 1) choice.ifAny = groups;
      else if (groups.length === 1) choice.if = groups[0];
      choices.push(choice);
    }
    // If empty block but has conditions, mark as dangling (apply to next/last link)
    if (!goToMatch && parsedLinks.choices.length === 0 && groups.length > 0) {
      dangling.push(groups);
    }
    // Replace with plain text (without link markup)
    return parsedLinks.text.replace(/\(go-to:[^)]+\)/g, '').trim();
  });
  // Handle bare (if:COND) without following [ ... ]: treat as dangling anchor
  const bareIfRegex = /\(if:\s*([^)]+?)\s*\)(?!\s*\[)/gi;
  clean = clean.replace(bareIfRegex, (_m, condSrc) => {
    const cond = String(condSrc).trim();
    const groups = parseConditionGroups(cond);
    if (groups.length > 0) dangling.push(groups);
    return '';
  });
  // Remove (else: ) [...] blocks content (keep plain text)
  clean = clean.replace(/\(else:\s*\)\s*\[([\s\S]*?)\]/gi, (_m, block) => {
    const parsed = parseLinks(block);
    // We don't create choices for else; keep text as is (links would be parsed later)
    return parsed.text;
  });
  return { text: clean, choices, dangling };
}

async function run() {
  const html = await fs.readFile(inputPath, 'utf8');

  // Get start pid from <tw-storydata ... startnode="X" ...>
  const storyDataOpen = html.match(/<tw-storydata[^>]*>/i)?.[0] ?? '';
  const startPid = extractAttr(storyDataOpen, 'startnode');
  const storyName = extractAttr(storyDataOpen, 'name') || path.basename(inputPath, path.extname(inputPath));

  // Extract all <tw-passagedata ...> ... </tw-passagedata>
  const passageRegex = /<tw-passagedata([^>]*)>([\s\S]*?)<\/tw-passagedata>/gi;
  const passages = [];
  const usedIds = new Set();
  let m;
  while ((m = passageRegex.exec(html))) {
    const attrs = m[1];
    const rawContent = m[2] ?? '';
    const pid = extractAttr(attrs, 'pid');
    const name = extractAttr(attrs, 'name') || pid || 'passage';
    let id = slugify(name);
    // If slugify results in only underscores or empty, fallback to pid
    if (!id || /^_+$/.test(id)) {
      id = String(pid || '').trim();
    }
    if (!id) id = 'passage';
    // Ensure uniqueness
    let baseId = id;
    let suffix = 1;
    while (usedIds.has(id)) {
      id = `${baseId}_${suffix++}`;
    }
    usedIds.add(id);
    let decoded = decodeEntities(rawContent);
    // Conditional blocks to produce conditional choices
    const ifParsed = parseIfBlocks(decoded);
    decoded = ifParsed.text;
    // (click:) blocks to produce choices with do-effects
    const clickParsed = parseClickBlocks(decoded);
    decoded = clickParsed.text;
    // Extract remaining (set: ...) effects and strip them from text
    const setParsed = parseSetEffectsFromText(decoded);
    decoded = setParsed.text;
    // Parse remaining plain links
    const parsedLinks = parseLinks(decoded);
    const choices = parsedLinks.choices;
    // Drop standalone choice lines from narrative
    let text = stripChoiceDisplayLines(parsedLinks.text, choices);
    // Normalize variable placeholders (fix common typos and unify to $var)
    text = text
      .replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_m, v) => `$${v}`)
      .replace(/\$siton_heart/g, '$sion_heart');
  // Apply dangling condition groups (from empty if blocks) to the last choices
  if (ifParsed.dangling && ifParsed.dangling.length > 0 && choices.length > 0) {
    for (const groups of ifParsed.dangling) {
      // Prefer a choice that likely corresponds to the guarded link:
      // heuristics: contains '그래도' or begins with '...' or contains '찾는다'
      let targetChoice =
        choices.find((c) => typeof c.text === 'string' && c.text.includes('그래도')) ||
        choices.find((c) => typeof c.text === 'string' && c.text.trim().startsWith('...')) ||
        choices.find((c) => typeof c.text === 'string' && c.text.includes('찾는다')) ||
        choices[choices.length - 1];
      if (groups.length > 1) targetChoice.ifAny = groups;
      else if (groups.length === 1) targetChoice.if = groups[0];
    }
  }
    passages.push({
      pid,
      name,
      id,
      text,
      choices: [...ifParsed.choices, ...clickParsed.choices, ...choices],
      enter: setParsed.effects
    });
  }

  if (passages.length === 0) {
    throw new Error('No <tw-passagedata> tags found. Unsupported Twine format?');
  }

  // Fallback: if a passage has no choices, synthesize a "다음으로" to the next numeric pid
  const pidNums = passages
    .map((p) => ({ p, n: Number(String(p.pid || '').trim()) }))
    .filter((x) => Number.isFinite(x.n))
    .sort((a, b) => a.n - b.n);
  for (const { p, n } of pidNums) {
    if (!p.choices || p.choices.length === 0) {
      const next = pidNums.find((x) => x.n > n);
      if (next) {
        p.choices = [
          {
            text: '다음으로',
            targetRaw: String(next.p.pid)
          }
        ];
      }
    }
  }

  // Build name/id maps for resolving links
  const byPid = new Map(passages.map((p) => [p.pid, p]));
  const byName = new Map(
    passages.map((p) => [String(p.name).trim(), p])
  );
  const bySlugName = new Map(
    passages.map((p) => [slugify(String(p.name).trim()), p])
  );

  let startId = passages[0].id;
  if (startPid && byPid.has(startPid)) {
    startId = byPid.get(startPid).id;
  } else {
    const startByName = byName.get('Start') || byName.get('start');
    if (startByName) startId = startByName.id;
  }

  // Resolve choice targets to passage ids
  for (const p of passages) {
    for (const c of p.choices) {
      const raw = String(c.targetRaw || '').trim();
      let targetId = '';
      if (byName.has(raw)) targetId = byName.get(raw).id;
      else if (bySlugName.has(slugify(raw))) targetId = bySlugName.get(slugify(raw)).id;
      else if (byPid.has(raw)) targetId = byPid.get(raw).id;
      else targetId = slugify(raw);
      c.goto = targetId;
      delete c.targetRaw;
    }
  }

  // Build initial variables from start passage (only constant sets)
  const init = {};
  const startPassage = passages.find((p) => p.id === startId);
  if (startPassage && Array.isArray(startPassage.enter)) {
    const remain = [];
    for (const eff of startPassage.enter) {
      if (eff.type === 'set' && (typeof eff.value === 'number' || typeof eff.value === 'boolean' || typeof eff.value === 'string')) {
        init[eff.key] = eff.value;
      } else {
        remain.push(eff);
      }
    }
    startPassage.enter = remain;
  }

  const out = {
    title: storyName,
    start: startId,
    init,
    passages: Object.fromEntries(
      passages.map((p) => [
        p.id,
        {
          id: p.id,
          text: p.text,
          choices: p.choices,
          enter: p.enter && p.enter.length ? p.enter : undefined
        }
      ])
    )
  };

  const outBase = slugify(storyName) || path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.resolve(projectRoot, `src/scenarios/${outBase}.ts`);
  const ts = `import type { Story } from '../story/types';

export const isekaiStory: Story = ${JSON.stringify(out, null, 2)} as const;
`;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, ts, 'utf8');
  console.log('Converted:', path.relative(projectRoot, outputPath));
  console.log('Hint: Loader will pick scenarios/*.ts automatically.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


