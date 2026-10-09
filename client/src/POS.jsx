import { useCallback, useEffect, useRef, useState } from 'react';
import { Barcode, Search, ShoppingCart, Plus, Minus, Trash2, ReceiptText, Printer } from 'lucide-react';
import './pos.css';
import './pos-advanced.css';

const money = n => `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function POS({ token, onStockChanged }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash');
  const [vatRateBps, setVatRateBps] = useState(1800);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const scanInput = useRef(null);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const load = useCallback(async () => {
    const response = await fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw Error(data.message || 'Unable to load products');
    setProducts(data.products); onStockChanged?.(data.products);
  }, [token, onStockChanged]);
  useEffect(() => { load().catch(err => setError(err.message)); }, [load]);
  useEffect(() => { fetch('/api/config').then(r=>r.json()).then(data=>setVatRateBps(data.vatRateBps)).catch(()=>{}); }, []);

  const subtotalCents = cart.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
  const taxCents = cart.reduce((sum, line) => sum + (line.taxMode === 'standard' ? Math.round(Math.round(line.price * 100) * vatRateBps / 10000) : 0) * line.quantity, 0);
  const total = (subtotalCents + taxCents) / 100;
  const paidValue = Number(paid);
  const change = Number.isFinite(paidValue) ? paidValue - total : -total;
  const matches = products.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 24);

  function add(p) {
    setError(''); setReceipt(null);
    const current = cart.find(line => line.id === p.id);
    if ((current?.quantity || 0) >= p.quantity) { setError('Not enough stock available'); return; }
    setCart(current ? cart.map(line => line.id === p.id ? { ...line, quantity: line.quantity + 1 } : line) : [...cart, { ...p, quantity: 1, available: p.quantity }]);
    setQuery(''); scanInput.current?.focus();
  }
  function scan(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const code = query.trim().toUpperCase();
    if (!code) return;
    const match = products.find(p => p.sku.toUpperCase() === code);
    if (match) add(match);
    else setError('No exact SKU/barcode match. Add this barcode as a product SKU in Inventory first.');
  }
  function qty(id, difference) {
    setCart(cart.map(line => line.id === id ? { ...line, quantity: Math.max(0, Math.min(line.available, line.quantity + difference)) } : line).filter(line => line.quantity > 0));
    setReceipt(null);
  }
  async function checkout() {
    if (!cart.length || (method === 'cash' && (!paid.trim() || !Number.isFinite(paidValue) || paidValue < total))) { setError('Enter sufficient cash received to complete checkout'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/sales/checkout', {
        method: 'POST', headers, body: JSON.stringify({ checkoutKey, customerName, paymentMethod: method, paid: method === 'cash' ? paidValue : undefined, items: cart.map(p => ({ productId: p.id, quantity: p.quantity })) })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Checkout failed');
      setReceipt(data.sale); setCart([]); setPaid(''); setCustomerName(''); setCheckoutKey(crypto.randomUUID());
      try { await load(); } catch (_refreshError) { setError('Sale saved successfully, but stock display could not refresh. Reload this page to see new quantities.'); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="posPage">
    <div className="posLayout"><section className="panel posCatalog">
      <div className="posHeader"><div><h2>Scan or find products</h2><p>USB barcode scanner: focus the input and scan. Most scanners send Enter automatically.</p></div><Barcode size={27} color="#286de3"/></div>
      <div className="posSearch"><Search size={19}/><input ref={scanInput} autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={scan} placeholder="Scan barcode / enter SKU / search name" aria-label="Scan barcode or search product"/></div>
      <div className="posProductList">{matches.map(p => <button key={p.id} onClick={() => add(p)} disabled={p.quantity < 1}><span><strong>{p.name}</strong><small>{p.sku} · {p.category}</small></span><span><b>{money(p.price)}</b><small>{p.quantity ? `${p.quantity} in stock` : 'Out of stock'}</small></span><Plus size={17}/></button>)}{!matches.length && <p className="posEmpty">No matching products</p>}</div>
    </section>
    <section className="panel posCart"><div className="posHeader"><h2><ShoppingCart size={21}/> Current sale</h2><span>{cart.reduce((sum,p)=>sum+p.quantity,0)} items</span></div>
      <div className="cartItems">{cart.length ? cart.map(p => <div className="cartLine" key={p.id}><div><strong>{p.name}</strong><small>{money(p.price)} each</small></div><div className="quantityControls"><button onClick={() => qty(p.id, -1)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{p.quantity}</span><button onClick={() => qty(p.id, 1)} disabled={p.quantity >= p.available} aria-label="Increase quantity"><Plus size={14}/></button><button onClick={() => setCart(cart.filter(x => x.id !== p.id))} aria-label="Remove product"><Trash2 size={14}/></button></div><b>{money(p.price*p.quantity)}</b></div>) : <div className="cartEmpty"><ShoppingCart size={32}/><p>No products in cart yet</p></div>}</div>
      <div className="checkoutInfo"><div className="changeRow">Subtotal <b>{money(subtotalCents/100)}</b></div><div className="changeRow">Tax <b>{money(taxCents/100)}</b></div><div className="totalRow"><span>Total</span><strong>{money(total)}</strong></div><label>Customer name (optional)<input value={customerName} maxLength={100} onChange={e=>setCustomerName(e.target.value)} placeholder="Walk-in customer"/></label><label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Cash</option><option value="card_demo">Card — DEMO ONLY (no real charge)</option></select></label>{method === 'cash' ? <><label>Cash received (LKR)<input type="number" min="0" step="0.01" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0.00"/></label><div className="changeRow">Change: <b>{money(Math.max(0, change))}</b></div></> : <p className="demoWarning">Simulation only. No card details collected and no payment gateway charged.</p>}{error && <div className="inventoryError" role="alert">{error}</div>}<button className="checkoutButton" disabled={busy || !cart.length} onClick={checkout}>{busy ? 'Completing sale…' : `Complete ${method === 'card_demo' ? 'DEMO card' : 'cash'} sale · ${money(total)}`}</button></div>
    </section></div>
    {receipt && <section className="panel receiptPanel"><div className="receiptToolbar"><h2><ReceiptText size={21}/> Sale completed — receipt</h2><button onClick={() => window.print()}><Printer size={17}/> Print receipt</button></div><div className="printReceipt"><h3>RetailFlow — General Retail Shop</h3><p>Receipt #{receipt.id.slice(-8).toUpperCase()} · {new Date(receipt.createdAt).toLocaleString()}</p>{receipt.customerName && <p>Customer: {receipt.customerName}</p>}<p>Payment: {receipt.paymentMethod === 'card_demo' ? 'DEMO CARD — NO REAL PAYMENT' : 'Cash'}</p><hr/>{receipt.items.map((p,i)=><div className="receiptRow" key={i}><span>{p.name} × {p.quantity}</span><span>{money(p.total)}</span></div>)}<hr/><div className="receiptRow"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div><div className="receiptRow"><span>Tax</span><span>{money(receipt.tax)}</span></div><div className="receiptRow"><b>Total</b><b>{money(receipt.total)}</b></div>{receipt.paymentMethod === 'cash' && <><div className="receiptRow"><span>Cash</span><span>{money(receipt.paid)}</span></div><div className="receiptRow"><span>Change</span><span>{money(receipt.change)}</span></div></>}<p>Thank you for shopping! {receipt.paymentMethod === 'card_demo' ? 'TEST RECEIPT — NOT PROOF OF PAYMENT' : ''}</p></div></section>}
  </div>;
}
