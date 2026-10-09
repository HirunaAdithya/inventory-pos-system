import { useEffect, useState } from 'react';
import { Boxes, LayoutDashboard, ShoppingCart, ChartColumnIncreasing, Settings, Store, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import Login from './Login.jsx';
import Products from './Products.jsx';
import POS from './POS.jsx';
import Management from './Management.jsx';
import Reports from './Reports.jsx';

const items = [
  { title: 'Dashboard', icon: LayoutDashboard },
  { title: 'Inventory', icon: Boxes },
  { title: 'Point of Sale', icon: ShoppingCart },
  { title: 'Reports', icon: ChartColumnIncreasing },
  { title: 'Settings', icon: Settings }
];

export default function App() {
  const [active, setActive] = useState('Dashboard');
  const [api, setApi] = useState('checking');
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    fetch('/api/health').then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(() => setApi('online')).catch(() => setApi('offline'));
    const token = sessionStorage.getItem('retailflow_token');
    if (!token) { setCheckingSession(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => setSession({ token, user: data.user }))
      .catch(() => sessionStorage.removeItem('retailflow_token'))
      .finally(() => setCheckingSession(false));
  }, []);
  useEffect(() => {
    if (!session || session.user.role !== 'admin' || active !== 'Dashboard') return;
    fetch('/api/reports/summary', { headers: { Authorization: `Bearer ${session.token}` } })
      .then(async r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => setSummary(data.summary))
      .catch(() => {});
  }, [session, active]);
  const logout = () => { sessionStorage.removeItem('retailflow_token'); setSession(null); setActive('Dashboard'); };
  if (checkingSession) return <div className="loading">Checking session…</div>;
  if (!session) return <Login onLogin={data => { sessionStorage.setItem('retailflow_token', data.token); setSession(data); }} />;
  const menu = session.user.role === 'admin' ? items : items.filter(i => ['Dashboard', 'Point of Sale'].includes(i.title));
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brandIcon"><Store size={22}/></span><div>RetailFlow<small>INVENTORY + POS</small></div></div>
      <div className="menuLabel">WORKSPACE</div>
      <nav>{menu.map(({ title, icon: Icon }) => <button className={active === title ? 'nav active' : 'nav'} key={title} onClick={() => setActive(title)}><Icon size={19}/>{title}</button>)}</nav>
      <div className="sidebarBottom">General Retail Shop <small>{session.user.role.toUpperCase()} · Version 1.0 Demo</small><button className="logout" onClick={logout}><LogOut size={16}/> Log out</button></div>
    </aside>
    <main className="main">
      <header><div><div className="eyebrow">GENERAL RETAIL SHOP</div><h1>{active}</h1><p>Inventory and sales, all in one place.</p></div><div className="avatar" title={session.user.email}>{session.user.name.slice(0, 2).toUpperCase()}</div></header>
      {active === 'Dashboard' ? <>
        <div className="stats"><div className="stat"><span>Active products</span><strong>{summary?.products ?? products.length}</strong><small>Inventory catalog</small></div><div className="stat"><span>Today's revenue</span><strong className="dashboardMoney">{summary ? `LKR ${summary.todayRevenue.toFixed(2)}` : '—'}</strong><small>Sri Lanka calendar day</small></div><div className="stat"><span>Low stock alerts</span><strong>{summary?.lowStock ?? products.filter(p => p.quantity <= p.lowStockAt).length}</strong><small>Products at or below threshold</small></div></div>
        <section className="panel"><div className="panelTitle"><h2>System overview</h2><span className="tag">DEMO VERSION</span></div><div className="check"><CheckCircle2 color="#14a06f" size={20}/> Admin and Cashier authentication</div><div className="check"><CheckCircle2 color="#14a06f" size={20}/> Product, category, supplier and stock management</div><div className="check"><CheckCircle2 color="#14a06f" size={20}/> Cash POS with barcode/SKU input and sales receipt</div><div className="check">{api === 'online' ? <CheckCircle2 color="#14a06f" size={20}/> : <AlertTriangle color="#e59a21" size={20}/>} Backend API: {api}</div></section>
      </> : active === 'Inventory' ? <Products token={session.token} role={session.user.role} onChanged={setProducts}/> : active === 'Point of Sale' ? <POS token={session.token} onStockChanged={setProducts}/> : active === 'Reports' ? <Reports token={session.token} onSummary={setSummary}/> : active === 'Settings' ? <Management token={session.token}/> : null}
    </main>
  </div>;
}
