import { useEffect, useState } from 'react';
import { Boxes, LayoutDashboard, ShoppingCart, ChartColumnIncreasing, Settings, Store, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import Login from './Login.jsx';

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
  const logout = () => { sessionStorage.removeItem('retailflow_token'); setSession(null); setActive('Dashboard'); };
  if (checkingSession) return <div className="loading">Checking session…</div>;
  if (!session) return <Login onLogin={data => { sessionStorage.setItem('retailflow_token', data.token); setSession(data); }} />;
  const menu = session.user.role === 'admin' ? items : items.filter(i => ['Dashboard', 'Point of Sale'].includes(i.title));
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brandIcon"><Store size={22}/></span><div>RetailFlow<small>INVENTORY + POS</small></div></div>
      <div className="menuLabel">WORKSPACE</div>
      <nav>{menu.map(({ title, icon: Icon }) => <button className={active === title ? 'nav active' : 'nav'} key={title} onClick={() => setActive(title)}><Icon size={19}/>{title}</button>)}</nav>
      <div className="sidebarBottom">General Retail Shop <small>{session.user.role.toUpperCase()} · Version 0.2</small><button className="logout" onClick={logout}><LogOut size={16}/> Log out</button></div>
    </aside>
    <main className="main">
      <header><div><div className="eyebrow">GENERAL RETAIL SHOP</div><h1>{active}</h1><p>Inventory and sales, all in one place.</p></div><div className="avatar" title={session.user.email}>{session.user.name.slice(0, 2).toUpperCase()}</div></header>
      {active === 'Dashboard' ? <>
        <div className="stats"><div className="stat"><span>Products</span><strong>—</strong><small>Connect products in Phase 3</small></div><div className="stat"><span>Today's sales</span><strong>—</strong><small>Connect checkout in Phase 4</small></div><div className="stat"><span>Low stock alerts</span><strong>—</strong><small>Real-time tracking coming soon</small></div></div>
        <section className="panel"><div className="panelTitle"><h2>Project setup status</h2><span className="tag">STEP 1</span></div><div className="check"><CheckCircle2 color="#14a06f" size={20}/> React frontend configured</div><div className="check"><CheckCircle2 color="#14a06f" size={20}/> Express API scaffolded</div><div className="check">{api === 'online' ? <CheckCircle2 color="#14a06f" size={20}/> : <AlertTriangle color="#e59a21" size={20}/>} Backend API: {api}</div><p className="muted">Next: Admin login, product catalog and MongoDB models.</p></section>
      </> : <section className="panel placeholder"><div className="placeholderIcon"><Boxes size={30}/></div><h2>{active} module</h2><p>This feature will be implemented in an upcoming phase.</p><span className="tag">COMING NEXT</span></section>}
    </main>
  </div>;
}
