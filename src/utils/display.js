import chalk from 'chalk';

// ─── primitives ────────────────────────────────────────────────────────────

export const hr = (char = '─', width = 60) => chalk.dim(char.repeat(width));

export function header(title, subtitle = '') {
  console.log('');
  console.log(chalk.bold.cyan(title));
  if (subtitle) console.log(chalk.dim(subtitle));
  console.log(hr());
}

export function field(label, value, color = 'white') {
  if (!value && value !== 0) return;
  const arr = Array.isArray(value) ? value : null;
  if (arr !== null && arr.length === 0) return;
  const display = arr ? arr.join(chalk.dim(', ')) : String(value);
  console.log(`${chalk.bold.yellow(label.padEnd(20))} ${chalk[color](display)}`);
}

export function bullet(label, items, indent = 2) {
  if (!items || items.length === 0) return;
  console.log(`\n${chalk.bold.yellow(label)}`);
  for (const item of items) {
    console.log(' '.repeat(indent) + chalk.dim('•') + ' ' + item);
  }
}

export function section(title) {
  console.log('');
  console.log(chalk.bold.magenta(title));
}

export function link(label, url) {
  if (!url) return;
  console.log(`${chalk.bold.yellow(label.padEnd(20))} ${chalk.underline.blue(url)}`);
}

export function tag(text, color = 'cyan') {
  return chalk[color](`[${text}]`);
}

export function success(msg) { console.log(chalk.green('✓ ' + msg)); }
export function warn(msg) { console.log(chalk.yellow('⚠ ' + msg)); }
export function info(msg) { console.log(chalk.cyan('ℹ ' + msg)); }
export function errorMsg(msg) { console.error(chalk.red('✗ ' + msg)); }

// ─── paper card ────────────────────────────────────────────────────────────

export function paperCard(paper, enriched = null, code = null) {
  header(
    paper.title,
    `arXiv:${paper.id}  •  ${paper.published ?? 'n/d'}  •  ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`
  );

  if (enriched?.tldr) {
    console.log('');
    console.log(chalk.bold('TL;DR'));
    console.log(chalk.italic(enriched.tldr));
  }

  if (paper.abstract) {
    console.log('');
    console.log(chalk.bold('Abstract'));
    const words = paper.abstract.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).length > 80) { lines.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line) lines.push(line.trim());
    console.log(chalk.dim(lines.slice(0, 6).join('\n')));
    if (lines.length > 6) console.log(chalk.dim('...'));
  }

  console.log('');
  console.log(hr());

  field('Categories', paper.categories?.join(', '));
  if (enriched) {
    field('Citations', enriched.citationCount !== undefined ? String(enriched.citationCount) : undefined);
    field('Fields', enriched.fieldsOfStudy?.join(', '));
  }

  console.log('');
  link('PDF', paper.pdfUrl ?? enriched?.pdfUrl);
  link('Abstract', paper.url);
  if (code?.pwcUrl) link('PapersWithCode', code.pwcUrl);

  if (code?.repos?.length) {
    bullet('Code', code.repos.map(r =>
      `${r.url}${r.stars ? chalk.dim(` ★${r.stars}`) : ''}${r.isOfficial ? chalk.green(' [official]') : ''}`
    ));
  }

  if (enriched?.references?.length) {
    bullet('Key References', enriched.references.map(r =>
      r.arxivId ? `${r.title} ${chalk.dim(`(arXiv:${r.arxivId})`)}` : r.title
    ));
  }

  console.log('');
}

// ─── search results ─────────────────────────────────────────────────────────

export function searchResultList(results) {
  if (!results.length) { warn('No results found.'); return; }
  console.log('');
  for (const [i, p] of results.entries()) {
    const num = chalk.dim(`[${i + 1}]`);
    const id = p.id ? chalk.cyan(`arXiv:${p.id}`) : (p.arxivId ? chalk.cyan(`arXiv:${p.arxivId}`) : chalk.dim('(no arXiv ID)'));
    const year = p.published?.slice(0, 4) ?? p.year ?? '';
    const cites = p.citations !== undefined ? chalk.dim(` ★${p.citations}`) : '';
    console.log(`${num} ${chalk.bold(p.title)}`);
    console.log(`    ${id}  ${chalk.dim(year)}${cites}`);
    if (p.authors?.length) console.log(`    ${chalk.dim(p.authors.slice(0, 3).join(', '))}${p.authors.length > 3 ? ' et al.' : ''}`);
    if (p.abstract) {
      const snippet = p.abstract.slice(0, 140).replace(/\s+/g, ' ');
      console.log(`    ${chalk.dim(snippet + (p.abstract.length > 140 ? '…' : ''))}`);
    }
    console.log('');
  }
}

// ─── dataset list ───────────────────────────────────────────────────────────

export function datasetList(hfDatasets, pwcDatasets) {
  const combined = [];

  for (const d of hfDatasets) {
    combined.push({
      name: d.name,
      source: 'HuggingFace',
      url: d.url,
      meta: `↓${d.downloads ?? 0} downloads  ♥${d.likes ?? 0}`,
      tags: d.tags?.slice(0, 4) ?? [],
    });
  }
  for (const d of pwcDatasets) {
    combined.push({
      name: d.name,
      source: 'PapersWithCode',
      url: d.url,
      meta: d.description?.slice(0, 80) ?? '',
      tags: d.modalities ?? [],
    });
  }

  if (!combined.length) { warn('No datasets found.'); return; }
  console.log('');
  for (const d of combined) {
    const src = tag(d.source, d.source === 'HuggingFace' ? 'yellow' : 'cyan');
    console.log(`${chalk.bold(d.name)} ${src}`);
    if (d.url) console.log(`  ${chalk.underline.blue(d.url)}`);
    if (d.meta) console.log(`  ${chalk.dim(d.meta)}`);
    if (d.tags.length) console.log(`  ${d.tags.map(t => chalk.dim('#' + t)).join('  ')}`);
    console.log('');
  }
}
