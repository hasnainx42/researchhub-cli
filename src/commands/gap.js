import ora from 'ora';
import chalk from 'chalk';
import { searchPapers } from '../api/arxiv.js';
import { searchSemantic } from '../api/semanticscholar.js';
import { searchBenchmarks } from '../api/paperswithcode.js';
import { header, section, hr, errorMsg } from '../utils/display.js';

/**
 * Heuristic gap detection from recent paper abstracts.
 * Looks for limitation phrases and underrepresented sub-topics.
 */
function detectGaps(papers) {
  const LIMITATION_PHRASES = [
    /limited to/gi, /does not (handle|support|address)/gi, /lack(s|ing) of/gi,
    /future work/gi, /remain(s)? (an )?open/gi, /unexplored/gi,
    /challenging to/gi, /difficult to scale/gi, /scarce (data|labels|annotations)/gi,
  ];

  const gaps = new Map();

  for (const p of papers) {
    const text = `${p.title} ${p.abstract ?? ''}`;
    for (const re of LIMITATION_PHRASES) {
      const match = text.match(re);
      if (match) {
        // extract a short surrounding snippet
        const idx = text.search(re);
        const snippet = text.slice(Math.max(0, idx - 20), idx + 80).replace(/\s+/g, ' ').trim();
        const key = match[0].toLowerCase();
        if (!gaps.has(key)) gaps.set(key, snippet);
      }
    }
  }

  return [...gaps.values()].slice(0, 8);
}

/**
 * Build a list of suggested research directions based on field-level
 * analysis of paper categories and benchmarks.
 */
function suggestDirections(papers, benchmarks) {
  const categories = {};
  for (const p of papers) {
    for (const c of p.categories ?? p.fields ?? []) {
      categories[c] = (categories[c] ?? 0) + 1;
    }
  }

  const dominant = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const suggestions = [];

  const catLower = dominant.map(c => c.toLowerCase());
  if (catLower.some(c => c.includes('cs.lg') || c.includes('machine learning'))) {
    suggestions.push('Few-shot and zero-shot learning on low-resource variants of this task');
    suggestions.push('Multimodal extensions combining text, image, and structured data');
  }
  if (catLower.some(c => c.includes('bio') || c.includes('med') || c.includes('q-bio'))) {
    suggestions.push('Cross-species generalization and transfer learning');
    suggestions.push('Clinical validation and real-world deployment challenges');
  }
  if (catLower.some(c => c.includes('nlp') || c.includes('cl'))) {
    suggestions.push('Low-resource and multilingual settings');
    suggestions.push('Hallucination detection and factual grounding');
  }
  if (benchmarks.length > 0) {
    suggestions.push(`New benchmark variants beyond ${benchmarks.slice(0, 2).map(b => b.name).join(', ')}`);
  }

  suggestions.push('Efficiency: reducing compute/memory without accuracy loss');
  suggestions.push('Explainability and interpretability of model decisions');

  return [...new Set(suggestions)].slice(0, 6);
}

export async function cmdGap(topic) {
  const spinner = ora(`Analyzing research landscape for "${topic}"…`).start();

  try {
    const [arxivPapers, ssPapers, benchmarks] = await Promise.all([
      searchPapers(topic, 15),
      searchSemantic(topic, 15),
      searchBenchmarks(topic, 5),
    ]);

    const allPapers = [...arxivPapers, ...ssPapers];

    spinner.stop();

    header(`Research Gaps: ${topic}`, `Analyzed ${allPapers.length} recent papers`);

    const gaps = detectGaps(allPapers);
    const directions = suggestDirections(allPapers, benchmarks);

    section('Detected Limitations in Literature');
    if (gaps.length) {
      for (const g of gaps) {
        console.log(`  ${chalk.dim('•')} ${chalk.italic(g)}`);
      }
    } else {
      console.log(chalk.dim('  No explicit limitations detected in titles/abstracts.'));
    }

    section('Suggested Research Directions');
    for (const [i, d] of directions.entries()) {
      console.log(`  ${chalk.bold.cyan(String(i + 1) + '.')} ${d}`);
    }

    if (benchmarks.length) {
      section('Active Benchmarks to Target');
      for (const b of benchmarks) {
        const count = b.paperCount ? chalk.dim(` (${b.paperCount} papers)`) : '';
        console.log(`  ${chalk.dim('•')} ${chalk.bold(b.name)}${count}`);
        if (b.url) console.log(`    ${chalk.underline.blue(b.url)}`);
      }
    }

    // Prolific sub-themes from titles
    const bigrams = {};
    for (const p of allPapers) {
      const words = (p.title ?? '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i].length < 3 || words[i + 1].length < 3) continue;
        const bg = `${words[i]} ${words[i + 1]}`;
        bigrams[bg] = (bigrams[bg] ?? 0) + 1;
      }
    }
    const hotTerms = Object.entries(bigrams)
      .filter(([, v]) => v >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);

    if (hotTerms.length) {
      section('Hot Sub-topics (by paper frequency)');
      console.log('  ' + hotTerms.map(t => chalk.cyan(`#${t.replace(' ', '-')}`)).join('  '));
    }

    console.log('');
    console.log(hr());
    console.log(chalk.dim('Tip: run') + ' ' + chalk.cyan(`research context "${topic}"`) + chalk.dim(' to export a full agent context file.'));
    console.log('');
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
