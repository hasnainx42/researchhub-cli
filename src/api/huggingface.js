import axios from 'axios';

const BASE = 'https://huggingface.co/api';
const client = axios.create({ baseURL: BASE, timeout: 15000 });

export async function searchDatasets(query, limit = 6) {
  try {
    const { data } = await client.get('/datasets', {
      params: { search: query, limit, full: false },
    });
    return (Array.isArray(data) ? data : []).map(d => ({
      id: d.id,
      name: d.id?.split('/').pop() ?? d.id,
      author: d.author ?? null,
      downloads: d.downloads ?? 0,
      likes: d.likes ?? 0,
      tags: (d.tags ?? []).slice(0, 6),
      url: `https://huggingface.co/datasets/${d.id}`,
      lastModified: d.lastModified?.slice(0, 10) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getDatasetInfo(datasetId) {
  try {
    const { data } = await client.get(`/datasets/${datasetId}`);
    return {
      id: data.id,
      description: data.cardData?.pretty_name ?? data.id,
      tags: data.tags ?? [],
      downloads: data.downloads ?? 0,
      url: `https://huggingface.co/datasets/${data.id}`,
      paperWithCode: data.cardData?.paperswithcode_id ?? null,
    };
  } catch {
    return null;
  }
}
