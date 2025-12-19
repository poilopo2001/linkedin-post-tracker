'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar, RefreshCw, ChevronDown, BarChart3, Activity, ThumbsUp, MessageCircle } from 'lucide-react';

export default function TrendsPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    try {
      setLoading(true);
      const [timelineData, categoriesData, engagementData] = await Promise.all([
        api.trends.timeline({ days }),
        api.trends.categories({ days }),
        fetch(`http://localhost:8000/api/trends/engagement?days=${days}`).then(r => r.json()),
      ]);
      setTimeline(timelineData.timeline || []);
      setCategories(categoriesData.breakdown || []);
      setEngagement(engagementData.engagement || []);
    } catch (err) {
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  }

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'rgb(15, 23, 42)',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    itemStyle: { color: '#fff', fontSize: '12px' },
    labelStyle: { color: '#94a3b8', fontSize: '11px', marginBottom: '4px' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500"></div>
          <span className="text-sm text-neutral-500">Chargement des tendances...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Tendances</h1>
          <p className="text-sm text-neutral-500 mt-1">Analyse de l'évolution des posts LinkedIn</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <select
              value={days}
              onChange={e => setDays(parseInt(e.target.value))}
              className="appearance-none pl-10 pr-9 py-2.5 text-sm font-medium border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
            >
              <option value={7}>7 derniers jours</option>
              <option value={14}>14 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Timeline chart */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-800">Volume de posts</h2>
              <p className="text-xs text-neutral-500">Évolution journalière sur {days} jours</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A66C2" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0A66C2" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Posts"
                  stroke="#0A66C2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPosts)"
                />
                <Area
                  type="monotone"
                  dataKey="total_likes"
                  name="Likes totaux"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLikes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories breakdown */}
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-category-thought-leadership/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-category-thought-leadership" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-800">Performance par catégorie</h2>
              <p className="text-xs text-neutral-500">Nombre de posts par type</p>
            </div>
          </div>
          <div className="p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categories.map(c => ({
                    ...c,
                    name: CATEGORY_LABELS[c.category] || c.category,
                    fill: CATEGORY_COLORS[c.category] || '#64748B'
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#334155' }}
                  />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 102, 194, 0.05)' }} />
                  <Bar dataKey="count" name="Posts" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Engagement by category */}
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-category-promotional/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-category-promotional" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-800">Engagement moyen</h2>
              <p className="text-xs text-neutral-500">Interactions par catégorie</p>
            </div>
          </div>
          <div className="p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={engagement.map(e => ({
                    ...e,
                    name: CATEGORY_LABELS[e.category] || e.category,
                    fill: CATEGORY_COLORS[e.category] || '#64748B'
                  }))}
                  margin={{ bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    angle={-45}
                    textAnchor="end"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="avg_engagement" name="Engagement moyen" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {engagement.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#8B5CF6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Categories detail table */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Détail par catégorie</h2>
            <p className="text-xs text-neutral-500">Métriques de performance détaillées</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Posts
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    Avg. Likes
                  </span>
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    Avg. Comments
                  </span>
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Confiance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map(cat => (
                <tr key={cat.category} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748B' }}
                      />
                      <span className="font-medium text-neutral-800">{CATEGORY_LABELS[cat.category] || cat.category}</span>
                    </div>
                  </td>
                  <td className="text-right px-5 py-4">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600">
                      {cat.count}
                    </span>
                  </td>
                  <td className="text-right px-5 py-4 text-sm text-neutral-600 font-medium">{cat.avg_likes}</td>
                  <td className="text-right px-5 py-4 text-sm text-neutral-600 font-medium">{cat.avg_comments}</td>
                  <td className="text-right px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {cat.avg_engagement}
                    </span>
                  </td>
                  <td className="text-right px-5 py-4">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${cat.avg_confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">{cat.avg_confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
