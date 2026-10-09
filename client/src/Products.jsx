import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Archive, Package, AlertTriangle } from 'lucide-react';
import './products.css';

const blank = { name: '', sku: '', category: 'General', supplierName: '', cost: '0', price: '', quantity: '0', lowStockAt: '5' };
const currency = value => `LKR ${Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Products({ token, role, onChanged }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', { headers });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Unable to load products');
      setProducts(data.products);
      onChanged?.(data.products);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [headers, onChanged]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all(['categories','suppliers'].map(async type => {
      const response = await fetch(`/api/manage/${type}`, { headers });
      if (!response.ok) return [];
      const result = await response.json();
      return result[type] || [];
    })).then(([c,s]) => { setCategories(c); setSuppliers(s); }).catch(() => {});
  }, [headers]);

  const filtered = products.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const low = products.filter(p => p.quantity <= p.lowStockAt).length;
  const edit = p => { setEditingId(p.id); setForm({ name: p.name, sku: p.sku, category: p.category, supplierName: p.supplierName || '', cost: String(p.cost || 0), price: String(p.price), quantity: String(p.quantity), lowStockAt: String(p.lowStockAt) }); setError(''); };
  const add = () => { setEditingId(null); setForm({ ...blank }); setError(''); };

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', {
        method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Unable to save product');
      setForm(null); setEditingId(null); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function archive(p) {
    if (!window.confirm(`Archive ${p.name}? It will be hidden from inventory.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/products/${p.id}`, { method: 'DELETE', headers });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Unable to archive product');
      await load();
    } catch (err) { setError(err.message); }
  }
  return <div className="productsPage">
    <div className="productTop"><div className="productCounts"><span><Package size={18}/> {products.length} active products</span><span><AlertTriangle size={18}/> {low} low stock</span></div>{role === 'admin' && <button className="primaryAction" onClick={add}><Plus size={17}/> Add Product</button>}</div>
    {error && <div className="inventoryError" role="alert">{error}</div>}
    <section className="panel"><div className="productsToolbar"><h2>Product catalog</h2><div className="searchBox"><Search size={17}/><input aria-label="Search products" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, category…"/></div></div>
      <div className="tableScroll"><table className="productTable"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th>{role === 'admin' && <th>Actions</th>}</tr></thead><tbody>
        {filtered.map(p => <tr key={p.id}><td className="productName">{p.name}</td><td>{p.sku}</td><td>{p.category}</td><td>{currency(p.price)}</td><td><span className={p.quantity <= p.lowStockAt ? 'stockBadge low' : 'stockBadge'}>{p.quantity} {p.quantity <= p.lowStockAt ? '· Low' : '· In stock'}</span></td>{role === 'admin' && <td><div className="itemActions"><button title="Edit" onClick={() => edit(p)}><Pencil size={16}/></button><button title="Archive" onClick={() => archive(p)}><Archive size={16}/></button></div></td>}</tr>)}
        {!loading && filtered.length === 0 && <tr><td className="emptyState" colSpan={role === 'admin' ? 6 : 5}>{search ? 'No matching products.' : 'No products yet. Add your first product.'}</td></tr>}
        {loading && <tr><td className="emptyState" colSpan={role === 'admin' ? 6 : 5}>Loading products…</td></tr>}
      </tbody></table></div>
    </section>
    {form && <div className="modalShade"><div className="productModal" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit product' : 'Add product'}><h2>{editingId ? 'Edit product' : 'Add new product'}</h2><p>Enter product details for your retail inventory.</p><form onSubmit={submit}>
      {['name','sku','category','supplierName','cost','price','quantity','lowStockAt'].map(field => <label key={field}>{({ name:'Product name', sku:'SKU / Barcode', category:'Category', supplierName:'Supplier name (optional)', cost:'Cost price (LKR)', price:'Selling price (LKR)', quantity:'Stock quantity', lowStockAt:'Low stock alert at' })[field]}<input required={!['supplierName'].includes(field)} list={field === 'category' ? 'category-options' : field === 'supplierName' ? 'supplier-options' : undefined} value={form[field]} type={['price','cost','quantity','lowStockAt'].includes(field) ? 'number' : 'text'} min={['price','cost','quantity','lowStockAt'].includes(field) ? '0' : undefined} step={field === 'price' || field === 'cost' ? '0.01' : ['quantity','lowStockAt'].includes(field) ? '1' : undefined} maxLength={field === 'name' ? 120 : field === 'sku' ? 40 : field === 'category' ? 60 : field === 'supplierName' ? 100 : undefined} onChange={e => setForm({ ...form, [field]: e.target.value })}/></label>)}
      <datalist id="category-options">{categories.map(c=><option key={c._id} value={c.name}/>)}</datalist>
      <datalist id="supplier-options">{suppliers.map(s=><option key={s._id} value={s.name}/>)}</datalist>
      <div className="modalButtons"><button type="button" onClick={() => { setForm(null); setError(''); }}>Cancel</button><button className="primaryAction" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}</button></div>
    </form></div></div>}
  </div>;
}
