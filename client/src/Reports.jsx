import { useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import Refunds from './Refunds.jsx';
import './reports.css';
import './reports-advanced.css';

const money = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function Reports({ token, onSummary }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [refundSale, setRefundSale] = useState(null);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    fetch('/api/reports/summary', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.message); return data; })
      .then(data => { setResult(data); onSummary?.(data.summary); })
      .catch(e=>setError(e.message));
  }, [token, onSummary, reload]);
  if (error) return <div className="inventoryError">{error}</div>;
  if (!result) return <section className="panel">Loading reports…</section>;
  const { summary, sales, refunds=[] } = result;
  return <div className="reportsPage"><div className="reportCards">{[
    ['Products', summary.products],['Low stock', summary.lowStock],['Transactions', summary.transactions],['Gross revenue', money(summary.revenue)],['Refunded', money(summary.refunded)],['Net revenue', money(summary.netRevenue)],['Estimated profit before returns', money(summary.estimatedGrossProfit)],['Today’s net revenue (Sri Lanka)', money(summary.todayRevenue)]
  ].map(([name,value])=><div className="stat" key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>
    {notice && <p className="successNotice">{notice}</p>}
    <section className="panel"><h2><ReceiptText size={21}/> Recent sales</h2><p className="muted">Last 100 transactions. Refunds must be approved and recorded by an Admin.</p><div className="tableScroll"><table className="productTable"><thead><tr><th>Receipt</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Payment</th><th>Total</th><th>Refunded</th><th>Action</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.id.slice(-8).toUpperCase()}</td><td>{new Date(s.date).toLocaleString()}</td><td>{s.cashier}</td><td>{s.customer}</td><td>{s.method==='card_demo'?'Demo card':'Cash'}</td><td>{money(s.total)}</td><td>{money(s.refunded)}</td><td><button disabled={s.refunded>=s.total} className="refundAction" onClick={()=>setRefundSale(s.id)}>Refund</button></td></tr>)}{!sales.length && <tr><td className="emptyState" colSpan={8}>No sales yet. Use Point of Sale to record a sale.</td></tr>}</tbody></table></div></section>
    <section className="panel"><h2>Recent refunds</h2><div className="tableScroll"><table className="productTable"><thead><tr><th>Refund</th><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Admin</th></tr></thead><tbody>{refunds.map(r=><tr key={r.id}><td>{r.id.slice(-8).toUpperCase()}</td><td>{new Date(r.date).toLocaleString()}</td><td>{money(r.amount)}</td><td>{r.reason}</td><td>{r.status}</td><td>{r.actor}</td></tr>)}{!refunds.length&&<tr><td className="emptyState" colSpan={6}>No refunds recorded.</td></tr>}</tbody></table></div></section>
    {refundSale&&<Refunds token={token} saleId={refundSale} onClose={()=>setRefundSale(null)} onComplete={r=>{setRefundSale(null);setNotice(`Refund recorded: ${money(r.amount)} (${r.status}).`);setReload(x=>x+1);}}/>}
  </div>;
}
