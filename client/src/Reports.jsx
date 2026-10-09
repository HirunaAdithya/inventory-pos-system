import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, ReceiptText } from 'lucide-react';
import './reports.css';

const money = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function Reports({ token, onSummary }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/reports/summary', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.message); return data; })
      .then(data => { setResult(data); onSummary?.(data.summary); })
      .catch(e=>setError(e.message));
  }, [token, onSummary]);
  if (error) return <div className="inventoryError">{error}</div>;
  if (!result) return <section className="panel">Loading reports…</section>;
  const { summary, sales } = result;
  return <div className="reportsPage"><div className="reportCards">{[
    ['Products', summary.products],['Low stock', summary.lowStock],['Transactions', summary.transactions],['Revenue', money(summary.revenue)],['Estimated gross profit', money(summary.estimatedGrossProfit)],['Today’s revenue (Sri Lanka)', money(summary.todayRevenue)]
  ].map(([name,value])=><div className="stat" key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>
    <section className="panel"><h2><ReceiptText size={21}/> Recent sales</h2><p className="muted">Last 100 transactions. Gross profit is an estimate based on product cost recorded when sold.</p><div className="tableScroll"><table className="productTable"><thead><tr><th>Receipt</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Items</th><th>Total</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.id.slice(-8).toUpperCase()}</td><td>{new Date(s.date).toLocaleString()}</td><td>{s.cashier}</td><td>{s.customer}</td><td>{s.items}</td><td>{money(s.total)}</td></tr>)}{!sales.length && <tr><td className="emptyState" colSpan={6}>No sales yet. Use Point of Sale to record a sale.</td></tr>}</tbody></table></div></section>
  </div>;
}
