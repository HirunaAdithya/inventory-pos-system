import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import './refunds.css';

const money = value => `LKR ${Number(value).toFixed(2)}`;

export default function Refunds({ token, saleId, onComplete, onClose }) {
  const [sale, setSale] = useState(null);
  const [quantity, setQuantity] = useState({});
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('Customer return');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refundKey, setRefundKey] = useState(()=>crypto.randomUUID());
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`/api/refunds/sale/${saleId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.message);return data;})
      .then(d=>{setSale(d.sale);setQuantity({});setRefundKey(crypto.randomUUID());})
      .catch(e=>setError(e.message));
  },[saleId,token]);

  const lines = sale?.items.map(i=>({...i, returnQuantity:Number(quantity[i.productId]||0), available:i.quantity-i.alreadyRefunded})) || [];
  const amount = lines.reduce((a,i)=>a+i.returnQuantity*i.unitRefund,0);
  const invalid = lines.some(i=>!Number.isSafeInteger(i.returnQuantity)||i.returnQuantity<0||i.returnQuantity>i.available);
  async function submit(event){
    event.preventDefault();
    if(invalid||amount<=0||!reason.trim()){setError('Select valid quantities and enter a reason');return;}
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/refunds',{method:'POST',headers,body:JSON.stringify({saleId,refundKey,restock,reason,items:lines.filter(i=>i.returnQuantity>0).map(i=>({productId:i.productId,quantity:i.returnQuantity}))})});
      const data=await response.json();if(!response.ok)throw Error(data.message||'Refund failed');
      onComplete?.(data.refund);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="refundBackdrop"><section className="refundDialog" role="dialog" aria-modal="true" aria-label="Process refund"><div className="refundHead"><h2><RotateCcw size={22}/> Return / Refund</h2><button onClick={onClose}>Close</button></div>
    {!sale ? <p>{error||'Loading receipt…'}</p> : <form onSubmit={submit}><p className="muted">Receipt #{sale.id.slice(-8).toUpperCase()} · Original: {money(sale.total)} · Previously refunded: {money(sale.refunded)}</p><div className="refundLines">{lines.map(line=><label key={line.productId}><span><b>{line.name}</b><small>{money(line.unitRefund)} each · {line.available} returnable</small></span><input type="number" min="0" max={line.available} step="1" value={quantity[line.productId]??0} onChange={e=>setQuantity({...quantity,[line.productId]:e.target.value})}/></label>)}</div>
      <label className="refundCheck"><input type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)}/> Return usable items to inventory stock</label><label className="refundReason">Reason<input required maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="refundTotal"><b>Refund amount</b><strong>{money(amount)}</strong></div><p className="demoWarning">{sale.method==='card_demo'?'DEMO CARD: No real refund is sent to a bank.':'CASH: Record the refund only after handing cash to the customer.'}</p>{error&&<div className="inventoryError">{error}</div>}<button className="primaryAction" disabled={busy||invalid||amount<=0}>{busy?'Processing…':'Record refund'}</button>
    </form>}
  </section></div>;
}
