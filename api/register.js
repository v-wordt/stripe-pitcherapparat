import { put, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const SHARED_SECRET = process.env.SHARED_SECRET;
const BLOB_PATH = 'register/companies.json';

async function readRegister() {
  const { blobs } = await list({ prefix: BLOB_PATH });
  if (blobs.length === 0) return [];
  const res = await fetch(blobs[0].url);
  return res.json();
}

async function writeRegister(companies) {
  await put(BLOB_PATH, JSON.stringify(companies), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const companies = await readRegister();
      return res.status(200).json({ companies });
    }

    if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { name } = req.body || {};
      if (!name?.trim()) return res.status(400).json({ error: 'name required' });
      const companies = await readRegister();
      const norm = name.trim().toLowerCase();
      const existing = companies.find(c => c.name.toLowerCase() === norm);
      if (existing) return res.status(200).json({ company: existing });
      const company = { id: uuidv4(), name: name.trim(), addedAt: new Date().toISOString(), profile: null, briefing: null };
      companies.push(company);
      await writeRegister(companies);
      return res.status(201).json({ company });
    }

    if (req.method === 'PATCH') {
      const { id, profile, briefing } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const companies = await readRegister();
      const idx = companies.findIndex(c => c.id === id);
      if (idx === -1) return res.status(404).json({ error: 'not found' });
      if (profile) companies[idx].profile = { ...profile, createdAt: new Date().toISOString() };
      if (briefing) companies[idx].briefing = { ...briefing, createdAt: new Date().toISOString() };
      await writeRegister(companies);
      return res.status(200).json({ company: companies[idx] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message });
  }
}
