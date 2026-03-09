#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

import { cmdPaper } from '../src/commands/paper.js';
import { cmdSearch } from '../src/commands/search.js';
import { cmdDataset } from '../src/commands/dataset.js';
import { cmdContext } from '../src/commands/context.js';
import { cmdReplicate } from '../src/commands/replicate.js';
import { cmdGap } from '../src/commands/gap.js';

const program = new Command();

program
  .name('research')
  .description(chalk.cyan('ResearchHub CLI') + ' — GitHub for papers, datasets & experiments, optimized for AI agents')
  .version('0.1.0');

// ─── paper ──────────────────────────────────────────────────────────────────
program
  .command('paper <arxiv-id>')
  .description('Fetch a structured summary of an arXiv paper  (e.g. research paper 2305.18430)')
  .action(cmdPaper);

// ─── search ─────────────────────────────────────────────────────────────────
program
  .command('search <query>')
  .description('Search papers across arXiv and Semantic Scholar  (e.g. research search "drug repurposing")')
  .option('-n, --limit <n>', 'Max results to return', '8')
  .option('-s, --source <source>', 'Source: arxiv | semantic | both', 'both')
  .action(cmdSearch);

// ─── dataset ────────────────────────────────────────────────────────────────
program
  .command('dataset <query>')
  .description('Discover datasets on HuggingFace and PapersWithCode  (e.g. research dataset protein-folding)')
  .option('-n, --limit <n>', 'Max results per source', '5')
  .action(cmdDataset);

// ─── context ────────────────────────────────────────────────────────────────
program
  .command('context <topic>')
  .description('Generate an LLM-ready context file (.md) for a research topic')
  .option('-o, --output <file>', 'Output file path')
  .action(cmdContext);

// ─── replicate ───────────────────────────────────────────────────────────────
program
  .command('replicate <paper>')
  .description('Step-by-step reproduction guide for a paper (arXiv ID or keyword)  (e.g. research replicate alphafold)')
  .action(cmdReplicate);

// ─── gap ─────────────────────────────────────────────────────────────────────
program
  .command('gap <topic>')
  .description('Identify research gaps and underexplored directions  (e.g. research gap drug-repurposing)')
  .action(cmdGap);

// ─── benchmark alias ─────────────────────────────────────────────────────────
program
  .command('benchmark <query>')
  .description('Search benchmarks and leaderboards on PapersWithCode')
  .action(async (query) => {
    const ora = (await import('ora')).default;
    const { searchBenchmarks } = await import('../src/api/paperswithcode.js');
    const { header, errorMsg, warn } = await import('../src/utils/display.js');
    const spinner = ora(`Searching benchmarks for "${query}"…`).start();
    try {
      const results = await searchBenchmarks(query, 8);
      spinner.stop();
      header(`Benchmarks: "${query}"`, `${results.length} tasks found on PapersWithCode`);
      if (!results.length) { warn('No benchmarks found.'); return; }
      console.log('');
      for (const b of results) {
        const count = b.paperCount ? chalk.dim(` (${b.paperCount} papers)`) : '';
        console.log(`${chalk.bold(b.name)}${count}`);
        if (b.description) console.log(`  ${chalk.dim(b.description.slice(0, 100))}`);
        if (b.url) console.log(`  ${chalk.underline.blue(b.url)}`);
        console.log('');
      }
    } catch (err) {
      spinner.stop();
      errorMsg(err.message);
    }
  });

program.parse(process.argv);
