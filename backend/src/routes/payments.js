import express from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { nextId } from '../utils/common.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { supplier_id, from, to } = req.query;
    const db = await getDb();
    let rows = db.data.payments || [];
    if (supplier_id) {
      rows = rows.filter(p => p.supplier_id === Number(supplier_id));
    }
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        rows = rows.filter(p => new Date(p.paid_at || Date.now()) >= fromDate);
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        rows = rows.filter(p => new Date(p.paid_at || Date.now()) <= toDate);
      }
    }
    rows = [...rows].sort((a, b) => {
      const ad = new Date(a.paid_at || 0).getTime();
      const bd = new Date(b.paid_at || 0).getTime();
      if (bd !== ad) return bd - ad;
      return (b.id || 0) - (a.id || 0);
    });
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { supplier_id, request_id, amount, currency, method, reference, notes, paid_at } = req.body;
    if (!supplier_id || !amount) return res.status(400).json({ error: 'supplier_id and amount are required' });
    const db = await getDb();
    if (!db.data.payments) db.data.payments = [];
    const id = nextId(db.data.payments);
    const payment = {
      id,
      supplier_id: Number(supplier_id),
      request_id: request_id ? Number(request_id) : null,
      amount: Number(amount),
      currency: currency || 'EGP',
      method: method || null,
      reference: reference || null,
      notes: notes || null,
      paid_at: paid_at || new Date().toISOString()
    };
    db.data.payments.push(payment);
    await db.write();
    return res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

export default router;
