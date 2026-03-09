import ora from 'ora';
import chalk from 'chalk';
import { fetchPaper } from '../api/arxiv.js';
import { getReproductionSteps } from '../api/paperswithcode.js';
import { enrichPaper } from '../api/semanticscholar.js';
import { header, section, errorMsg, warn, hr } from '../utils/display.js';

function isArxivId(input) {
  return /^\d{4}\.\d{4,5}(v\d+)?$/.test(input);
}

export async function cmdReplicate(input) {
  const spinner = ora(`Building reproduction guide for "${input}"…`).start();

  // input can be arXiv ID or a keyword (we search for it)
  let arxivId = input;

  try {
    // if not an arXiv ID, search and pick top result
    if (!isArxivId(input)) {
      const { searchPapers } = await import('../api/arxiv.js');
      const results = await searchPapers(input, 3);
      if (!results.length) throw new Error(`No paper found matching "${input}"`);
      arxivId = results[0].id;
      spinner.text = `Found: ${results[0].title} (${arxivId}) — fetching details…`;
    }

    const [paper, pwc, enriched] = await Promise.all([
      fetchPaper(arxivId),
      getReproductionSteps(arxivId),
      enrichPaper(arxivId),
    ]);

    spinner.stop();

    header(
      `Reproduction Guide: ${paper.title}`,
      `arXiv:${arxivId}  •  ${paper.published ?? ''}`
    );

    section('Step 1 — Read the Paper');
    console.log(`  ${chalk.underline.blue(paper.pdfUrl)}`);
    if (enriched?.tldr) console.log(`  ${chalk.dim('TL;DR:')} ${chalk.italic(enriched.tldr)}`);

    section('Step 2 — Understand the Methods');
    const methods = pwc?.methods ?? enriched?.fieldsOfStudy ?? [];
    if (methods.length) {
      for (const m of methods) console.log(`  ${chalk.dim('•')} ${m}`);
    } else {
      console.log(chalk.dim('  (methods not indexed — see paper abstract)'));
    }

    section('Step 3 — Set Up the Repository');
    const repos = pwc?.repos ?? [];
    if (repos.length) {
      for (const r of repos) {
        const official = r.isOfficial ? chalk.green(' [official]') : '';
        const stars = r.stars ? chalk.dim(` ★${r.stars}`) : '';
        const framework = r.framework ? chalk.cyan(` [${r.framework}]`) : '';
        console.log(`  ${chalk.underline.blue(r.url)}${official}${stars}${framework}`);
      }
      console.log('');
      console.log(`  ${chalk.dim('$ git clone')} ${chalk.cyan(repos[0].url.replace('https://github.com/', 'https://github.com/'))}`);
      if (repos[0].framework === 'PyTorch' || repos[0].framework === 'TensorFlow') {
        console.log(`  ${chalk.dim('$ pip install -r requirements.txt')}`);
      }
    } else {
      warn('  No indexed code repository found. Check the paper for a code link.');
    }

    section('Step 4 — Download Data');
    const { searchDatasets: hfSearch } = await import('../api/huggingface.js');
    const datasets = await hfSearch(paper.title.split(' ').slice(0, 3).join(' '), 3);
    if (datasets.length) {
      for (const d of datasets) {
        console.log(`  ${chalk.bold(d.name)} — ${chalk.underline.blue(d.url)}`);
      }
    } else {
      console.log(chalk.dim('  Search PapersWithCode or the paper appendix for dataset links.'));
    }

    section('Step 5 — Run & Evaluate');
    console.log(`  ${chalk.dim('# Follow the README in the repository for training commands.')}`);
    if (pwc?.pwcUrl) {
      console.log(`  Leaderboard & baselines: ${chalk.underline.blue(pwc.pwcUrl)}`);
    }

    console.log('');
    console.log(hr());
    console.log(chalk.dim('Tip: run') + ' ' + chalk.cyan(`research context "${input}"`) + chalk.dim(' to export an agent-ready markdown file.'));
    console.log('');
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
