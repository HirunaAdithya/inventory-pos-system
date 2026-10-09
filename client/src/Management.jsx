import { useEffect, useState } from 'react';
import './management.css';

const tabs = [{ id:'categories', label:'Categories' },{ id:'suppliers', label:'Suppliers' },{ id:'stock', label:'Stock In / Out' },{ id:'users', label:'Cashier Accounts' },{ id:'audit', label:'Audit Log' }];
const initial = { name:'', phone:'', email:'', password:'', productId:'', change:'', note:'' };

export default function Management({ token }) {
  const [tab, setTab] = useState('categories');
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function request(path, opts = {}) {
    const response = await fetch(`/api/manage/${path}`, { ...opts, headers });
    const json = await response.json();
    if (!response.ok) throw Error(json.message || 'Request failed');
    return json;
  }
  async function load(target = tab) {
    setLoading(true);
    try {
      const endpoint = target === 'stock' ? 'stock/movements' : target;
      const response = await request(endpoint);
      setData(response.movements || response.logs || response[target] || []);
      if (target === 'stock') {
        const productResponse = await fetch('/api/products', { headers });
        const result = await productResponse.json();
        if (!productResponse.ok) throw Error(result.message || 'Unable to load products');
        setProducts(result.products);
      }
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { setForm(initial); setNotice(''); load(tab); }, [tab]);

  async function submit(e) {
    e.preventDefault(); setError(''); setNotice('');
    let endpoint = tab === 'stock' ? 'stock/adjust' : tab;
    const body = tab === 'categories' ? { name: form.name } : tab === 'suppliers' ? { name: form.name, phone: form.phone, email: form.email } : tab === 'stock' ? { productId: form.productId, change: Number(form.change), note: form.note } : { name: form.name, email: form.email, password: form.password };
    try { await request(endpoint, { method:'POST', body: JSON.stringify(body) }); setForm(initial); setNotice('Saved successfully'); await load(tab); }
    catch (err) { setError(err.message); }
  }
  async function remove(type, id) {
    if (!window.confirm('Delete this item?')) return;
    try { await request(`${type}/${id}`, { method:'DELETE' }); await load(tab); }
    catch (err) { setError(err.message); }
  }
  async function toggleUser(user) {
    try { await request(`users/${user._id}/active`, { method:'PATCH', body: JSON.stringify({ active: !user.active }) }); await load('users'); }
    catch (err) { setError(err.message); }
  }
  return <div className="managementPage">
    <div className="managementTabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'selected' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
    {error && <div className="inventoryError" role="alert">{error}</div>}{notice && <p className="successNotice">{notice}</p>}
    <div className="managementGrid"><section className="panel"><h2>{tab === 'audit' ? 'Audit history' : tab === 'stock' ? 'Adjust stock quantity' : tab === 'users' ? 'Create cashier account' : `Add ${tab === 'categories' ? 'category' : 'supplier'}`}</h2>
      {tab === 'audit' ? <p className="muted">Recent sensitive actions: cashier creation/status changes, stock adjustments and refunds. Read-only records.</p> :
      <form className="managementForm" onSubmit={submit}>
        {tab === 'stock' ? <><label>Product<select required value={form.productId} onChange={e=>setForm({...form, productId:e.target.value})}><option value="">Select a product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — current {p.quantity}</option>)}</select></label><label>Quantity change (+ stock in / − stock out)<input type="number" required step="1" value={form.change} onChange={e=>setForm({...form,change:e.target.value})} placeholder="e.g. 10 or -2"/></label><label>Reason / note<input value={form.note} maxLength={240} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Supplier delivery, damage…"/></label></> : <>
          <label>{tab === 'users' ? 'Cashier name' : 'Name'}<input required value={form.name} maxLength={100} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          {tab === 'suppliers' && <label>Phone<input value={form.phone} maxLength={30} onChange={e=>setForm({...form,phone:e.target.value})}/></label>}
          {(tab === 'suppliers' || tab === 'users') && <label>Email<input type="email" required={tab === 'users'} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>}
          {tab === 'users' && <label>Initial password (12+ characters)<input type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
        </>}
        <button type="submit" className="primaryAction">{tab === 'stock' ? 'Save stock adjustment' : tab === 'users' ? 'Create cashier' : 'Add new'}</button>
      </form>}
    </section><section className="panel"><h2>{tab === 'audit' ? 'Recent audit events' : tab === 'stock' ? 'Recent stock movements' : tab === 'users' ? 'User accounts' : `Existing ${tab}`}</h2>
      {loading && <p>Loading…</p>}
      <div className="managementList">{data.map(d => <div className="managementItem" key={d._id}>
        <div>{tab === 'audit' ? <><strong>{d.action}</strong><small>{d.actor?.name || 'Admin'} · {d.subjectId} · {d.note || ''} · {new Date(d.createdAt).toLocaleString()}</small></> : tab === 'stock' ? <><strong>{d.sku} · {d.change > 0 ? '+' : ''}{d.change} units</strong><small>{d.type} · After: {d.after} · {d.note || 'No note'} · {new Date(d.createdAt).toLocaleString()}</small></> : <><strong>{d.name}</strong><small>{tab === 'users' ? `${d.email} · ${d.role} · ${d.active ? 'Active' : 'Disabled'}` : tab === 'suppliers' ? `${d.phone || 'No phone'} · ${d.email || 'No email'}` : 'Product category'}</small></>}</div>
        {(tab === 'categories' || tab === 'suppliers') && <button onClick={()=>remove(tab,d._id)}>Delete</button>}
        {tab === 'users' && d.role === 'cashier' && <button onClick={()=>toggleUser(d)}>{d.active ? 'Disable' : 'Enable'}</button>}
      </div>)}{!loading && data.length === 0 && <p className="muted">No records yet.</p>}</div>
    </section></div>
  </div>;
}
