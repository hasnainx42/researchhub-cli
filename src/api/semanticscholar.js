import axios from 'axios';

const BASE = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = 'title,abstract,authors,year,citationCount,influentialCitationCount,fieldsOfStudy,tldr,openAccessPdf,externalIds,references.title,references.externalIds';

const client = axios.create({ baseURL: BASE, timeout: 15000 });

export async function enrichPaper(arxivId) {
  try {
    const { data } = await client.get(`/paper/arXiv:${arxivId}`, {
      params: { fields: FIELDS },
    });
    return {
      tldr: data.tldr?.text ?? null,
      citationCount: data.citationCount ?? 0,
      influentialCitations: data.influentialCitationCount ?? 0,
      fieldsOfStudy: data.fieldsOfStudy ?? [],
      pdfUrl: data.openAccessPdf?.url ?? null,
      semanticId: data.paperId ?? null,
      references: (data.references ?? []).slice(0, 5).map(r => ({
        title: r.title,
        arxivId: r.externalIds?.ArXiv ?? null,
      })),
    };
  } catch {
    return null; // graceful degradation — SS may not have all papers
  }
}

export async function searchSemantic(query, limit = 8) {
  try {
    const { data } = await client.get('/paper/search', {
      params: {
        query,
        limit,
        fields: 'title,abstract,authors,year,citationCount,externalIds,fieldsOfStudy',
      },
    });
    return (data.data ?? []).map(p => ({
      title: p.title,
      abstract: p.abstract,
      authors: (p.authors ?? []).map(a => a.name),
      year: p.year,
      citations: p.citationCount,
      arxivId: p.externalIds?.ArXiv ?? null,
      fields: p.fieldsOfStudy ?? [],
    }));
  } catch {
    return [];
  }
}
