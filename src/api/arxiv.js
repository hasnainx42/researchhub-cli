import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const BASE = 'https://export.arxiv.org/api/query';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function parseEntry(entry) {
  const authors = [].concat(entry.author || []);
  return {
    id: entry.id?.split('/abs/')?.pop()?.trim() ?? entry.id,
    title: entry.title?.replace(/\s+/g, ' ').trim(),
    abstract: entry.summary?.replace(/\s+/g, ' ').trim(),
    authors: authors.map(a => (typeof a === 'string' ? a : a.name)).filter(Boolean),
    published: entry.published?.slice(0, 10),
    updated: entry.updated?.slice(0, 10),
    categories: [].concat(entry.category || []).map(c => c['@_term'] ?? c).filter(Boolean),
    url: entry.id?.trim(),
    pdfUrl: entry.id?.trim().replace('/abs/', '/pdf/'),
  };
}

export async function fetchPaper(arxivId) {
  const clean = arxivId.replace(/^arxiv:/i, '');
  const { data } = await axios.get(BASE, {
    params: { id_list: clean, max_results: 1 },
    timeout: 15000,
  });
  const parsed = parser.parse(data);
  const entries = [].concat(parsed?.feed?.entry ?? []);
  if (!entries.length) throw new Error(`No paper found for arXiv ID: ${arxivId}`);
  return parseEntry(entries[0]);
}

export async function searchPapers(query, maxResults = 8) {
  const { data } = await axios.get(BASE, {
    params: {
      search_query: `all:${query}`,
      max_results: maxResults,
      sortBy: 'relevance',
    },
    timeout: 15000,
  });
  const parsed = parser.parse(data);
  const entries = [].concat(parsed?.feed?.entry ?? []);
  return entries.map(parseEntry);
}
