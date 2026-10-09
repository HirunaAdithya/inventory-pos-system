import { useState } from 'react';
import { Store, LockKeyhole } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Login failed');
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <div className="loginPage"><div className="loginCard">
    <div className="loginLogo"><Store size={26}/></div>
    <div className="eyebrow">RETAIL MANAGEMENT PLATFORM</div>
    <h1>Welcome back</h1><p>Sign in to manage your store and sales.</p>
    <form onSubmit={submit} className="loginForm">
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"/>
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/>
      {error && <div className="loginError" role="alert">{error}</div>}
      <button type="submit" disabled={loading}><LockKeyhole size={18}/>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <small>Admin and Cashier access · Authorized users only</small>
  </div></div>;
}
