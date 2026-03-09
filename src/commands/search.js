import ora from 'ora';
import chalk from 'chalk';
import { searchPapers } from '../api/arxiv.js';
import { searchSemantic } from '../api/semanticscholar.js';
import { header, searchResultList, errorMsg, info } from '../utils/display.js';

export async function cmdSearch(query, opts = {}) {
  const limit = parseInt(opts.limit ?? 8, 10);
  const source = opts.source ?? 'both';
  const spinner = ora(`Searching for "${query}"…`).start();

  try {
    let results = [];

    if (source === 'arxiv' || source === 'both') {
      const arxivResults = await searchPapers(query, limit);
      results.push(...arxivResults);
    }

    if (source === 'semantic' || source === 'both') {
      const ssResults = await searchSemantic(query, limit);
      // deduplicate by arxivId
      const seen = new Set(results.map(r => r.id).filter(Boolean));
      for (const r of ssResults) {
        if (r.arxivId && seen.has(r.arxivId)) continue;
        results.push(r);
      }
    }

    // sort by citation count if available
    results.sort((a, b) => (b.citations ?? b.citationCount ?? 0) - (a.citations ?? a.citationCount ?? 0));
    results = results.slice(0, limit);

    spinner.stop();
    header(`Search results for "${query}"`, `${results.length} papers found`);
    searchResultList(results);

    if (results.length) {
      info(`Run ${chalk.cyan('research paper <arXiv-ID>')} to get full details for any paper above.`);
    }
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
