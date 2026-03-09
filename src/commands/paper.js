import ora from 'ora';
import { fetchPaper } from '../api/arxiv.js';
import { enrichPaper } from '../api/semanticscholar.js';
import { getPaperCode } from '../api/paperswithcode.js';
import { paperCard, errorMsg } from '../utils/display.js';

export async function cmdPaper(arxivId) {
  const spinner = ora(`Fetching paper ${arxivId}…`).start();

  try {
    const [paper, enriched, code] = await Promise.all([
      fetchPaper(arxivId),
      enrichPaper(arxivId),
      getPaperCode(arxivId),
    ]);
    spinner.stop();
    paperCard(paper, enriched, code);
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
