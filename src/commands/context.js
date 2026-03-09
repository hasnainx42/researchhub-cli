import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { searchPapers } from '../api/arxiv.js';
import { enrichPaper } from '../api/semanticscholar.js';
import { searchDatasets as hfSearch } from '../api/huggingface.js';
import { searchDatasets as pwcSearch, searchBenchmarks } from '../api/paperswithcode.js';
import { buildContextFile } from '../utils/context.js';
import { header, success, errorMsg, info } from '../utils/display.js';

export async function cmdContext(topic, opts = {}) {
  const outFile = opts.output ?? `${topic.replace(/\s+/g, '_').toLowerCase()}_context.md`;
  const spinner = ora(`Building context for "${topic}"…`).start();

  try {
    spinner.text = 'Fetching papers…';
    const arxivPapers = await searchPapers(topic, 6);

    spinner.text = 'Enriching with Semantic Scholar…';
    const enriched = await Promise.all(
      arxivPapers.filter(p => p.id).slice(0, 4).map(async p => {
        const ss = await enrichPaper(p.id);
        return {
          ...p,
          tldr: ss?.tldr ?? null,
          codeUrl: null,
        };
      })
    );

    spinner.text = 'Fetching datasets…';
    const [hfDatasets, pwcDatasets, benchmarks] = await Promise.all([
      hfSearch(topic, 5),
      pwcSearch(topic, 5),
      searchBenchmarks(topic, 5),
    ]);

    const datasets = [
      ...hfDatasets.map(d => ({ name: d.name, url: d.url, meta: `↓${d.downloads} HuggingFace`, tags: d.tags })),
      ...pwcDatasets.map(d => ({ name: d.name, url: d.url, meta: d.description?.slice(0, 80) ?? '', tags: d.modalities })),
    ];

    // simple heuristic gaps
    const gaps = [
      `Low-resource and cross-domain transfer in ${topic}`,
      `Benchmarks beyond standard splits for ${topic}`,
      `Efficient architectures for ${topic} at scale`,
      `Interpretability and uncertainty quantification`,
    ];

    spinner.text = 'Writing context file…';
    const md = buildContextFile({ topic, papers: enriched, datasets, benchmarks, gaps });
    await fs.writeFile(path.resolve(outFile), md, 'utf8');

    spinner.stop();
    header(`Context file: ${outFile}`);
    console.log('');
    console.log(`  ${chalk.bold('Papers')}: ${enriched.length}`);
    console.log(`  ${chalk.bold('Datasets')}: ${datasets.length}`);
    console.log(`  ${chalk.bold('Benchmarks')}: ${benchmarks.length}`);
    console.log('');
    success(`Written to ${chalk.cyan(outFile)}`);
    info('Pipe to an LLM agent: ' + chalk.cyan(`cat ${outFile} | llm "Plan an experiment"`));
    console.log('');
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
