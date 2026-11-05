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
