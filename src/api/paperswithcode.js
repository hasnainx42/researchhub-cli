import axios from 'axios';

const BASE = 'https://paperswithcode.com/api/v1';
const client = axios.create({ baseURL: BASE, timeout: 15000 });

export async function getPaperCode(arxivId) {
  try {
    const { data } = await client.get('/papers/', { params: { arxiv_id: arxivId } });
    const papers = data.results ?? [];
    if (!papers.length) return null;

    const paper = papers[0];
    const reposRes = await client.get(`/papers/${paper.id}/repositories/`).catch(() => ({ data: { results: [] } }));
    const repos = (reposRes.data.results ?? []).slice(0, 3).map(r => ({
      url: r.url,
      stars: r.stars ?? 0,
      framework: r.framework ?? null,
      isOfficial: r.is_official ?? false,
    }));

    return { repos, pwcUrl: `https://paperswithcode.com/paper/${paper.id}` };
  } catch {
    return null;
  }
}

export async function searchDatasets(query, limit = 5) {
  try {
    const { data } = await client.get('/datasets/', { params: { q: query, limit } });
    return (data.results ?? []).map(d => ({
      name: d.name,
      fullName: d.full_name,
      url: d.url,
      description: d.description,
      modalities: d.modalities ?? [],
    }));
  } catch {
    return [];
  }
}

export async function searchBenchmarks(query, limit = 5) {
  try {
    const { data } = await client.get('/tasks/', { params: { q: query, limit } });
    return (data.results ?? []).map(t => ({
      name: t.name,
      description: t.description,
      url: `https://paperswithcode.com/task/${t.id}`,
      paperCount: t.paper_count ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getReproductionSteps(arxivId) {
  try {
    const { data } = await client.get('/papers/', { params: { arxiv_id: arxivId } });
    const papers = data.results ?? [];
    if (!papers.length) return null;

    const paper = papers[0];
    const [reposRes, methodsRes] = await Promise.all([
      client.get(`/papers/${paper.id}/repositories/`).catch(() => ({ data: { results: [] } })),
      client.get(`/papers/${paper.id}/methods/`).catch(() => ({ data: { results: [] } })),
    ]);

    return {
      title: paper.title,
      arxivId,
      pwcUrl: `https://paperswithcode.com/paper/${paper.id}`,
      repos: (reposRes.data.results ?? []).slice(0, 2).map(r => ({
        url: r.url,
        framework: r.framework,
        isOfficial: r.is_official,
        stars: r.stars,
      })),
      methods: (methodsRes.data.results ?? []).slice(0, 5).map(m => m.name),
    };
  } catch {
    return null;
  }
}
