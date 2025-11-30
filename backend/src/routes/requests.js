import express from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { nextId } from '../utils/common.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { supplier_id, status, q, from, to, type } = req.query;
    const db = await getDb();
    const suppliers = db.data.suppliers || [];
    let rows = (db.data.requests || []).map(r => ({
      ...r,
      supplier_name: suppliers.find(s => s.id === Number(r.supplier_id))?.name || null
    }));

    if (supplier_id) rows = rows.filter(r => Number(r.supplier_id) === Number(supplier_id));
    if (status) rows = rows.filter(r => String(r.status) === String(status));
    if (type) rows = rows.filter(r => String(r.payment_type||'') === String(type));
    if (q) {
      const ql = String(q).toLowerCase();
      rows = rows.filter(r => (
        (r.description||'').toLowerCase().includes(ql) ||
        (r.request_title||'').toLowerCase().includes(ql) ||
        (r.project_name||'').toLowerCase().includes(ql) ||
        (r.invoice_number||'').toLowerCase().includes(ql) ||
        (r.supplier_name||'').toLowerCase().includes(ql)
      ));
    }
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        rows = rows.filter(r => new Date(r.created_at || Date.now()) >= fromDate);
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        rows = rows.filter(r => new Date(r.created_at || Date.now()) <= toDate);
      }
    }
    rows = [...rows].sort((a,b) => {
      const ad = new Date(a.created_at||0).getTime();
      const bd = new Date(b.created_at||0).getTime();
      if (bd !== ad) return bd - ad;
      return Number(b.id||0) - Number(a.id||0);
    });
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const {
      supplier_id,
      description,
      status,
      payment_type,
      project_name,
      amount,
      notes,
      invoice_number,
      invoice_image_url,
      request_title,
      due_date
    } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });
    const db = await getDb();
    db.data.requests = Array.isArray(db.data.requests) ? db.data.requests : [];
    const id = nextId(db.data.requests);
    const row = {
      id,
      supplier_id: Number(supplier_id),
      description: description || null,
      status: status || 'pending',
      payment_type: payment_type || null,
      project_name: project_name || null,
      amount: amount != null ? Number(amount) : null,
      notes: notes || null,
      invoice_number: invoice_number || null,
      invoice_image_url: invoice_image_url || null,
      request_title: request_title || null,
      due_date: due_date || null,
      created_at: new Date().toISOString(),
    };
    db.data.requests.push(row);
    await db.write();
    return res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const {
      supplier_id,
      description,
      status,
      payment_type,
      project_name,
      amount,
      notes,
      invoice_number,
      invoice_image_url,
      request_title,
      due_date
    } = req.body;
    const db = await getDb();
    if (!db.data.requests) db.data.requests = [];
    const idx = db.data.requests.findIndex(r => r.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const existing = db.data.requests[idx];
    const updated = {
      ...existing,
      supplier_id: supplier_id ?? existing.supplier_id,
      description: description ?? existing.description,
      status: status ?? existing.status,
      payment_type: payment_type ?? existing.payment_type,
      project_name: project_name ?? existing.project_name,
      amount: amount != null ? Number(amount) : existing.amount,
      notes: notes ?? existing.notes,
      invoice_number: invoice_number ?? existing.invoice_number,
      invoice_image_url: invoice_image_url ?? existing.invoice_image_url,
      request_title: request_title ?? existing.request_title,
      due_date: due_date ?? existing.due_date,
    };
    db.data.requests[idx] = updated;
    await db.write();
    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const db = await getDb();
    if (!db.data.requests) db.data.requests = [];
    const before = db.data.requests.length;
    db.data.requests = db.data.requests.filter(r => r.id !== Number(req.params.id));
    if (db.data.requests.length === before) return res.status(404).json({ error: 'Not found' });
    await db.write();
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
