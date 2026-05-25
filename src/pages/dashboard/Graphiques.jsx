import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COULEURS_CATEG = ['#10B981','#6366F1','#F59E0B','#EC4899','#06B6D4','#EF4444','#F97316','#8B5CF6']

// Formateur FCFA
const fmt = (v) => v >= 1000000
  ? `${(v / 1000000).toFixed(1)}M`
  : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`

const fmtFull = (v) => new Intl.NumberFormat('fr-FR').format(v) + ' FCFA'

// ===== GRAPHIQUE REVENUS vs DÉPENSES =====
export function GraphRevenusDep({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12}/>
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gradBen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.12}/>
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={45} />
        <Tooltip
          contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#F9FAFB' }}
          formatter={(v, name) => [fmtFull(v), name]}
          labelStyle={{ color: '#D1D5DB', marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area type="monotone" dataKey="revenus"  name="Revenus"  stroke="#10B981" strokeWidth={2} fill="url(#gradRev)" dot={{ r: 3, fill: '#10B981' }} />
        <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#EF4444" strokeWidth={2} fill="url(#gradDep)" dot={{ r: 3, fill: '#EF4444' }} />
        <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke="#6366F1" strokeWidth={2} fill="url(#gradBen)" dot={{ r: 3, fill: '#6366F1' }} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ===== GRAPHIQUE DÉPENSES PAR CATÉGORIE =====
export function GraphDepCateg({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
            paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COULEURS_CATEG[i % COULEURS_CATEG.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 10, fontSize: 12, color: '#F9FAFB' }}
            formatter={(v) => [fmtFull(v), '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2 min-w-0">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COULEURS_CATEG[i % COULEURS_CATEG.length] }} />
            <span className="text-cendre-600 truncate flex-1">{d.name}</span>
            <span className="font-semibold text-cendre-800 shrink-0">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== GRAPHIQUE BARRES PRESTATAIRES =====
export function GraphPrestataires({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="prenom" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 10, fontSize: 12, color: '#F9FAFB' }}
          formatter={(v) => [v + ' prestations', '']}
        />
        <Bar dataKey="prestations_mois" name="Prestations" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#10B981' : i === 1 ? '#34D399' : '#6EE7B7'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
