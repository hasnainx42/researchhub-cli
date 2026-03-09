import ora from 'ora';
import chalk from 'chalk';
import { searchDatasets as hfSearch } from '../api/huggingface.js';
import { searchDatasets as pwcSearch } from '../api/paperswithcode.js';
import { header, datasetList, errorMsg, info } from '../utils/display.js';

export async function cmdDataset(query, opts = {}) {
  const limit = parseInt(opts.limit ?? 5, 10);
  const spinner = ora(`Searching datasets for "${query}"…`).start();

  try {
    const [hfDatasets, pwcDatasets] = await Promise.all([
      hfSearch(query, limit),
      pwcSearch(query, limit),
    ]);

    spinner.stop();
    header(`Datasets: "${query}"`, `${hfDatasets.length + pwcDatasets.length} found across HuggingFace & PapersWithCode`);
    datasetList(hfDatasets, pwcDatasets);

    info(`Use ${chalk.cyan('research context <topic>')} to generate an agent-ready context file.`);
  } catch (err) {
    spinner.stop();
    errorMsg(err.message);
    process.exit(1);
  }
}
