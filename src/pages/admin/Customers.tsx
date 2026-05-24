import { useState } from 'react'
import { Search, User, Phone, Clock, Package } from 'lucide-react'

const MOCK_CUSTOMERS = [
  { id: 'C001', name: '林雅文', phone: '0912345678', orders: 23, lastOrder: '2024-05-24', totalSpend: 3420 },
  { id: 'C002', name: '陳佳穎', phone: '0923456789', orders: 17, lastOrder: '2024-05-23', totalSpend: 2580 },
  { id: 'C003', name: '王大偉', phone: '0934567890', orders: 41, lastOrder: '2024-05-24', totalSpend: 6150 },
  { id: 'C004', name: '張美華', phone: '0945678901', orders: 9,  lastOrder: '2024-05-22', totalSpend: 1250 },
  { id: 'C005', name: '劉志明', phone: '0956789012', orders: 55, lastOrder: '2024-05-24', totalSpend: 8720 },
  { id: 'C006', name: '吳淑玲', phone: '0967890123', orders: 6,  lastOrder: '2024-05-20', totalSpend: 780 },
  { id: 'C007', name: '黃建宏', phone: '0978901234', orders: 32, lastOrder: '2024-05-23', totalSpend: 4890 },
  { id: 'C008', name: '蔡雅婷', phone: '0989012345', orders: 14, lastOrder: '2024-05-21', totalSpend: 2100 },
]

export default function AdminCustomers() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_CUSTOMERS.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search)
  )

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">客戶管理</h1>
        <div className="text-surface-400 text-sm">共 {MOCK_CUSTOMERS.length} 位客戶</div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 max-w-md">
        <Search size={16} className="text-surface-400" />
        <input
          className="bg-transparent text-sm placeholder-surface-400 text-white outline-none flex-1"
          placeholder="搜尋客戶姓名或電話..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop table */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <table className="w-full hidden md:table">
          <thead>
            <tr className="border-b border-surface-700">
              {['客戶', '電話', '訂單數', '上次下單', '累計消費'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-surface-400 text-xs font-semibold uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-surface-700/40 transition-colors cursor-pointer">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-700 rounded-xl flex items-center justify-center font-semibold text-sm">
                      {c.name[0]}
                    </div>
                    <span className="font-medium text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-surface-300">{c.phone}</td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-sm">{c.orders}</span>
                  <span className="text-surface-400 text-sm"> 筆</span>
                </td>
                <td className="px-5 py-4 text-sm text-surface-300">{c.lastOrder}</td>
                <td className="px-5 py-4 font-semibold text-white text-sm">NT${c.totalSpend.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-surface-700">
          {filtered.map(c => (
            <div key={c.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-700 rounded-2xl flex items-center justify-center font-bold">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                  <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>
                  <span className="flex items-center gap-1"><Package size={10} /> {c.orders} 筆</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-sm">NT${c.totalSpend.toLocaleString()}</div>
                <div className="text-surface-500 text-xs flex items-center gap-1 justify-end mt-0.5">
                  <Clock size={9} /> {c.lastOrder}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
