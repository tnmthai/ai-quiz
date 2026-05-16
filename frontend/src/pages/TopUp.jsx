import { useState, useEffect } from 'react';
import axios from 'axios';

const COIN_TIERS = [
  { amountVnd: 10000, coins: 10, bonus: 0, label: '10,000đ', total: 10, popular: false },
  { amountVnd: 50000, coins: 50, bonus: 10, label: '50,000đ', total: 60, popular: false },
  { amountVnd: 100000, coins: 100, bonus: 30, label: '100,000đ', total: 130, popular: true },
  { amountVnd: 200000, coins: 200, bonus: 80, label: '200,000đ', total: 280, popular: false },
];

const GATEWAYS = [
  { id: 'demo', name: 'Demo (Thử nghiệm)', icon: '🧪', desc: 'Thanh toán demo' },
  { id: 'momo', name: 'MoMo', icon: '📱', desc: 'Ví MoMo' },
  { id: 'vnpay', name: 'VNPay', icon: '🏦', desc: 'ATM, Visa, QR', disabled: true },
];

export default function TopUp({ token, user, onCoinsUpdated }) {
  const [selectedTier, setSelectedTier] = useState(2);
  const [selectedGateway, setSelectedGateway] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    try { const { data } = await axios.get('/api/payment/transactions', { headers: { Authorization: `Bearer ${token}` } }); setTransactions(data); }
    catch (e) { console.error(e); }
  };

  const handleTopUp = async () => {
    setLoading(true); setError(''); setSuccess(null);
    try {
      const { data: orderData } = await axios.post('/api/payment/create-order', { tierIndex: selectedTier, gateway: selectedGateway }, { headers: { Authorization: `Bearer ${token}` } });
      if (orderData.demoMode) {
        const { data: payResult } = await axios.get(orderData.paymentUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (payResult.success) { setSuccess(payResult); if (onCoinsUpdated) onCoinsUpdated(); fetchTransactions(); }
        else setError(payResult.error || 'Thanh toán thất bại');
      }
    } catch (err) { setError(err.response?.data?.error || 'Có lỗi xảy ra'); }
    finally { setLoading(false); }
  };

  const tier = COIN_TIERS[selectedTier];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">🪙 Nạp Coin</h1>

      {/* Balance */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-6 mb-5 shadow-lg shadow-amber-200/50">
        <p className="text-amber-100 text-sm font-medium">Số coin hiện tại</p>
        <p className="text-4xl font-extrabold text-white mt-1">{user?.coins ?? 0} 🪙</p>
        <p className="text-amber-100 text-sm mt-1">1 coin = 1 đề thi</p>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {COIN_TIERS.map((t, i) => (
          <button key={i} onClick={() => setSelectedTier(i)}
            className={`relative p-5 rounded-2xl border-2 text-left transition active:scale-[0.98] ${selectedTier === i ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200/50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
            {t.popular && <span className="absolute -top-2.5 left-4 bg-orange-500 text-white text-xs px-3 py-0.5 rounded-full font-bold">PHỔ BIẾN</span>}
            <p className="text-xl font-bold text-gray-900">{t.label}</p>
            <p className="text-lg text-indigo-600 font-bold mt-1">{t.total} coins</p>
            {t.bonus > 0 && <p className="text-sm text-green-600 font-medium mt-1">+{t.bonus} bonus ({Math.round(t.bonus / t.coins * 100)}%)</p>}
          </button>
        ))}
      </div>

      {/* Gateway */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 mb-3">💳 Phương thức thanh toán</h2>
        <div className="space-y-2">
          {GATEWAYS.map(gw => (
            <button key={gw.id} onClick={() => !gw.disabled && setSelectedGateway(gw.id)} disabled={gw.disabled}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${selectedGateway === gw.id ? 'border-indigo-500 bg-indigo-50' : gw.disabled ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-200 hover:border-indigo-300'}`}>
              <span className="text-2xl">{gw.icon}</span>
              <div className="flex-1">
                <p className="text-base font-bold text-gray-800">{gw.name}</p>
                <p className="text-sm text-gray-500">{gw.desc}</p>
              </div>
              {gw.disabled && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full">Sớm</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Pay */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-base text-gray-600">Gói: {tier.label}</span>
          <span className="text-lg font-bold text-gray-900">{tier.total} coins</span>
        </div>
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-3">⚠️ {error}</div>}
        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium mb-3">✅ {success.message} — +{success.coinsAdded} coins!</div>}
        <button onClick={handleTopUp} disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-2xl text-lg font-bold hover:shadow-lg transition disabled:opacity-50 active:scale-[0.98]">
          {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Đang xử lý...</span> : `Nạp ${tier.total} coins — ${tier.label}`}
        </button>
      </div>

      {/* History */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-3">📋 Lịch sử giao dịch</h2>
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700 font-medium">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <span className={`text-base font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} 🪙</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
