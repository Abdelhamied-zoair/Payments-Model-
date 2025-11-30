import express from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { nextId, normalizeSupplierPayload } from '../utils/common.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { q, bank, dateFrom, dateTo } = req.query;
    const db = await getDb();
    let rows = db.data.suppliers || [];
    if (q) {
      const ql = String(q).toLowerCase();
      rows = rows.filter(s =>
        (s.name || '').toLowerCase().includes(ql) ||
        (s.phone || '').toLowerCase().includes(ql) ||
        (s.email || '').toLowerCase().includes(ql) ||
        (s.bank_name || '').toLowerCase().includes(ql) ||
        (s.tax_number || '').toLowerCase().includes(ql)
      );
    }
    if (bank) {
      const bl = String(bank).toLowerCase();
      rows = rows.filter(s => (s.bank_name || '').toLowerCase().includes(bl));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        rows = rows.filter(s => new Date(s.created_at || Date.now()) >= from);
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        rows = rows.filter(s => new Date(s.created_at || Date.now()) <= to);
      }
    }
    rows = [...rows].sort((a, b) => (b.id || 0) - (a.id || 0));
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const db = await getDb();
    const row = (db.data.suppliers || []).find(s => s.id === Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (error) {
    next(error);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const payload = normalizeSupplierPayload(req.body || {});
    if (!payload.name) return res.status(400).json({ error: 'name is required' });
    const db = await getDb();
    db.data.suppliers = Array.isArray(db.data.suppliers) ? db.data.suppliers : [];
    const id = nextId(db.data.suppliers);
    const supplier = {
      id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      bank_name: payload.bank_name,
      iban: payload.iban,
      tax_number: payload.tax_number,
      created_at: new Date().toISOString(),
    };
    db.data.suppliers.push(supplier);
    await db.write();
    return res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const p = normalizeSupplierPayload(req.body || {});
    const db = await getDb();
    if (!db.data.suppliers) db.data.suppliers = [];
    const idx = db.data.suppliers.findIndex(s => s.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const existing = db.data.suppliers[idx];
    const updated = {
      ...existing,
      name: p.name ?? existing.name,
      email: p.email ?? existing.email,
      phone: p.phone ?? existing.phone,
      address: p.address ?? existing.address,
      bank_name: p.bank_name ?? existing.bank_name,
      iban: p.iban ?? existing.iban,
      tax_number: p.tax_number ?? existing.tax_number,
    };
    db.data.suppliers[idx] = updated;
    await db.write();
    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const db = await getDb();
    if (!db.data.suppliers) db.data.suppliers = [];
    const before = db.data.suppliers.length;
    db.data.suppliers = db.data.suppliers.filter(s => s.id !== Number(req.params.id));
    if (db.data.suppliers.length === before) return res.status(404).json({ error: 'Not found' });
    // Cascade delete requests and payments related to supplier
    if (db.data.requests) {
      db.data.requests = db.data.requests.filter(r => r.supplier_id !== Number(req.params.id));
    }
    if (db.data.payments) {
      db.data.payments = db.data.payments.filter(p => p.supplier_id !== Number(req.params.id));
    }
    await db.write();
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
