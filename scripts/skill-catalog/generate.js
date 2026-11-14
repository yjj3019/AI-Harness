#!/usr/bin/env node
/**
 * Generate a simple skill catalog from SKILL.md frontmatter.
 * Usage: node scripts/skill-catalog/generate.js
 * Output: docs/skill-catalog.md
 */
const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', '..', 'skills');
const outFile = path.join(__dirname, '..', '..', 'docs', 'skill-catalog.md');

// 1.2.0 증분 갱신: 소스(SKILL.md)가 출력보다 오래되지 않았으면 재생성 스킵 (실측 근거:
// 생성 1.5s/회 — 스폰 2.3s 계수 지배. --force로 강제 재생성).
if (!process.argv.includes('--force')) {
  let newest = 0;
  let found = 0;
  for (const dir of fs.readdirSync(skillsDir)) {
    const p = path.join(skillsDir, dir, 'SKILL.md');
    try { const s = fs.statSync(p); found++; if (s.mtimeMs > newest) newest = s.mtimeMs; } catch { /* not a skill */ }
  }
  let outMtime = -1;
  try { outMtime = fs.statSync(outFile).mtimeMs; } catch { /* first run */ }
  // 소스 SKILL.md가 하나도 없으면(found = 0) 스킵하지 않는다: 소스 없음은 "최신"이 아니라
  // "생성 필요"다 (dashboard-status.js와 동일 회귀 방지: 빈 소스에서 생성 대신 스킵 → stale 유지).
  if (found > 0 && outMtime >= newest) {
    console.log(`skill-catalog: up-to-date (소스 미변경, skills ${found}개). --force로 강제 재생성`);
    process.exit(0);
  }
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('>') || val === '') {
        // multi-line description handling is simplified
        continue;
      }
      fm[m[1]] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  // crude multi-line description
  const descMatch = match[1].match(/description:\s*>?\s*([\s\S]*?)(?=\n\w+:|$)/);
  if (descMatch) {
    fm.description = descMatch[1].replace(/\n\s*/g, ' ').trim();
  }
  return fm;
}

const entries = [];
for (const dir of fs.readdirSync(skillsDir)) {
  const skillPath = path.join(skillsDir, dir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) continue;
  const content = fs.readFileSync(skillPath, 'utf8');
  const fm = extractFrontmatter(content);
  entries.push({
    name: fm.name || dir,
    description: (fm.description || '').slice(0, 200),
    path: `skills/${dir}/SKILL.md`
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name));

let md = `# Skill Catalog\n\nAuto-generated from SKILL.md frontmatter. Do not edit by hand.\n\n| Skill | Description | Path |\n|-------|-------------|------|\n`;
for (const e of entries) {
  const desc = e.description.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  md += `| ${e.name} | ${desc} | \`${e.path}\` |\n`;
}
md += `\nGenerated: ${new Date().toISOString().slice(0, 10)}\n`;

fs.writeFileSync(outFile, md);
console.log(`Wrote ${entries.length} skills to ${outFile}`);
