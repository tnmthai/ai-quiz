import { useState, useEffect } from 'react';
import axios from 'axios';

const COIN_TIERS = [
  { amountVnd: 10000, coins: 10, bonus: 0, label: '10,000đ', total: 10, popular: false },
  { amountVnd: 50000, coins: 50, bonus: 10, label: '50,000đ', total: 60, popular: false },
  { amountVnd: 100000, coins: 100, bonus: 30, label: '100,000đ', total: 130, popular: true },
  { amountVnd: 200000, coins: 200, bonus: 80, label: '200,000đ', total: 280, popular: false },
];

const GATEWAYS = [
  { id: 'demo', name: 'Demo (Thử nghiệm)', icon: '🧪', desc: 'Thanh toán demo — không tốn tiền thật' },
  { id: 'vnpay', name: 'VNPay', icon: '🏦', desc: 'ATM, Visa, MasterCard, QR', disabled: true },
  { id: 'momo', name: 'MoMo', icon: '📱', desc: 'Ví MoMo', disabled: true },
  { id: 'zalopay', name: 'ZaloPay', icon: '💚', desc: 'Ví ZaloPay', disabled: true },
];

export default function TopUp({ token, user, onCoinsUpdated }) {
  const [selectedTier, setSelectedTier] = useState(2); // Default to 100k (popular)
  const [selectedGateway, setSelectedGateway] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data } = await axios.get('/api/payment/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const handleTopUp = async () => {
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // Create order
      const { data: orderData } = await axios.post('/api/payment/create-order', {
        tierIndex: selectedTier,
        gateway: selectedGateway,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (orderData.demoMode) {
        // Demo: immediately "pay"
        const { data: payResult } = await axios.get(orderData.paymentUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (payResult.success) {
          setSuccess(payResult);
          if (onCoinsUpdated) onCoinsUpdated();
          fetchTransactions();
        } else {
          setError(payResult.error || 'Thanh toán thất bại');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const tier = COIN_TIERS[selectedTier];

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <h1 className="text-lg font-bold text-gray-800">🪙 Nạp Coin</h1>

      {/* Current balance */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Số coin hiện tại</p>
          <p className="text-2xl font-bold text-amber-700">{user?.coins ?? 0} 🪙</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">1 coin = 1 đề thi</p>
          <p className="text-xs text-gray-400">(~2 trang A4)</p>
        </div>
      </div>

      {/* Pricing tiers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💰 Chọn gói nạp</h2>
        <div className="grid grid-cols-2 gap-3">
          {COIN_TIERS.map((t, i) => (
            <button
              key={i}
              onClick={() => setSelectedTier(i)}
              className={`relative p-4 rounded-xl border-2 text-left transition ${
                selectedTier === i
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {t.popular && (
                <span className="absolute -top-2 left-3 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  PHỔ BIẾN
                </span>
              )}
              <div className="text-base font-bold text-gray-800">{t.label}</div>
              <div className="text-sm text-blue-600 font-semibold mt-1">{t.total} coins</div>
              {t.bonus > 0 && (
                <div className="text-[11px] text-green-600 mt-1">
                  +{t.bonus} bonus ({Math.round(t.bonus / t.coins * 100)}%)
                </div>
              )}
              <div className="text-[11px] text-gray-400 mt-1">
                {t.amountVnd / t.total < 1000 ? `${(t.amountVnd / t.total).toFixed(0)}đ/coin` : `${(t.amountVnd / t.total).toFixed(0)}đ/coin`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment gateway */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💳 Phương thức thanh toán</h2>
        <div className="space-y-2">
          {GATEWAYS.map(gw => (
            <button
              key={gw.id}
              onClick={() => !gw.disabled && setSelectedGateway(gw.id)}
              disabled={gw.disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                selectedGateway === gw.id
                  ? 'border-blue-500 bg-blue-50'
                  : gw.disabled
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <span className="text-xl">{gw.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">{gw.name}</div>
                <div className="text-[11px] text-gray-400">{gw.desc}</div>
              </div>
              {gw.disabled && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sớm</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary & pay button */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Gói: {tier.label}</span>
          <span className="text-sm font-semibold text-gray-800">{tier.total} coins</span>
        </div>
        {tier.bonus > 0 && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-green-600">Bonus</span>
            <span className="text-xs text-green-600">+{tier.bonus} coins</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Tổng thanh toán</span>
            <span className="text-lg font-bold text-blue-600">{tier.label}</span>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs mb-3">⚠️ {error}</div>}
        {success && (
          <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs mb-3">
            ✅ {success.message} — Đã cộng {success.coinsAdded} coins!
          </div>
        )}

        <button
          onClick={handleTopUp}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 text-sm font-semibold"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Đang xử lý...
            </span>
          ) : `Nạp ${tier.total} coins — ${tier.label}`}
        </button>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Lịch sử giao dịch</h2>
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs text-gray-700">{tx.description}</p>
                  <p className="text-[11px] text-gray-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
