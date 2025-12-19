'use client';

import { useEffect, useState } from 'react';
import { api, DashboardStats } from '@/lib/api';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatNumber } from '@/lib/utils';
import { Building2, FileText, TrendingUp, Clock, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api.trends.dashboard(30);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500"></div>
          <span className="text-sm text-neutral-500">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-light border border-error/20 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
            <span className="text-error text-lg">!</span>
          </div>
          <div>
            <h3 className="font-medium text-neutral-800">Erreur de chargement</h3>
            <p className="text-sm text-neutral-600 mt-1">{error}</p>
            <button
              onClick={loadStats}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = stats.posts_by_category.map(item => ({
    name: CATEGORY_LABELS[item.category] || item.category,
    value: item.count,
    color: CATEGORY_COLORS[item.category] || '#64748B',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Vue d'ensemble des posts LinkedIn</p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-150 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Entreprises"
          value={stats.total_companies}
          subtitle={`${stats.active_companies} actives`}
          icon={<Building2 className="w-5 h-5" />}
          color="primary"
          trend={stats.active_companies > 0 ? 'up' : undefined}
        />
        <KPICard
          title="Posts totaux"
          value={stats.total_posts}
          subtitle="Tous temps"
          icon={<FileText className="w-5 h-5" />}
          color="success"
        />
        <KPICard
          title="7 derniers jours"
          value={stats.posts_last_7_days}
          subtitle="Nouveaux posts"
          icon={<Clock className="w-5 h-5" />}
          color="thought-leadership"
          trend={stats.posts_last_7_days > 0 ? 'up' : undefined}
        />
        <KPICard
          title="Top catégorie"
          value={stats.posts_by_category[0]?.category ? CATEGORY_LABELS[stats.posts_by_category[0].category] : 'N/A'}
          subtitle={`${stats.posts_by_category[0]?.percentage || 0}% des posts`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="promotional"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart - Catégories */}
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card hover:shadow-card-hover transition-shadow duration-200">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-base font-semibold text-neutral-800">Répartition par catégorie</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Distribution des posts par type de contenu</p>
          </div>
          <div className="p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(15, 23, 42)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-neutral-600 truncate">{item.name}</span>
                  <span className="text-xs font-medium text-neutral-800 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart - Top entreprises */}
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card hover:shadow-card-hover transition-shadow duration-200">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-base font-semibold text-neutral-800">Top entreprises actives</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Classement par nombre de publications</p>
          </div>
          <div className="p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_companies.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    dataKey="company_name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#334155' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(15, 23, 42)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                    cursor={{ fill: 'rgba(10, 102, 194, 0.05)' }}
                  />
                  <Bar
                    dataKey="post_count"
                    fill="#0A66C2"
                    name="Posts"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-800">Analyse de sentiment</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Tonalité globale des publications</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.posts_by_sentiment.map(item => {
              const config = getSentimentConfig(item.sentiment);
              return (
                <div
                  key={item.sentiment}
                  className={`flex items-center gap-4 p-4 rounded-lg ${config.bg}`}
                >
                  <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-800 capitalize">{item.sentiment}</p>
                    <p className="text-2xl font-semibold text-neutral-900 mt-0.5">{item.count}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-full h-1.5 rounded-full bg-neutral-200`}>
                        <div
                          className={`h-full rounded-full ${config.bar}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500 ml-1">{item.percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'thought-leadership' | 'promotional';
  trend?: 'up' | 'down';
}) {
  const colorConfig = {
    primary: {
      iconBg: 'bg-primary-500/10',
      iconText: 'text-primary-500',
      accent: 'border-l-primary-500',
    },
    success: {
      iconBg: 'bg-success/10',
      iconText: 'text-success',
      accent: 'border-l-success',
    },
    'thought-leadership': {
      iconBg: 'bg-category-thought-leadership/10',
      iconText: 'text-category-thought-leadership',
      accent: 'border-l-category-thought-leadership',
    },
    promotional: {
      iconBg: 'bg-category-promotional/10',
      iconText: 'text-category-promotional',
      accent: 'border-l-category-promotional',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`bg-surface rounded-lg border border-neutral-200 shadow-card hover:shadow-card-hover transition-all duration-200 p-5 border-l-[3px] ${config.accent}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-semibold text-neutral-800">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {trend && (
              <span className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-success' : 'text-error'}`}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${config.iconBg} ${config.iconText}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function getSentimentConfig(sentiment: string) {
  switch (sentiment) {
    case 'positive':
      return {
        bg: 'bg-success-light',
        iconBg: 'bg-success/20',
        bar: 'bg-success',
        icon: <ArrowUpRight className="w-5 h-5 text-success" />,
      };
    case 'negative':
      return {
        bg: 'bg-error-light',
        iconBg: 'bg-error/20',
        bar: 'bg-error',
        icon: <ArrowDownRight className="w-5 h-5 text-error" />,
      };
    default:
      return {
        bg: 'bg-neutral-100',
        iconBg: 'bg-neutral-300/50',
        bar: 'bg-neutral-400',
        icon: <div className="w-5 h-5 rounded-full bg-neutral-400" />,
      };
  }
}
