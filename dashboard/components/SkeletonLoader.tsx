export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-neutral-200 rounded"></div>
            <div className="h-3 w-20 bg-neutral-100 rounded"></div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-6 w-24 bg-neutral-200 rounded-md"></div>
      </td>
      <td className="px-5 py-4 text-center">
        <div className="inline-block h-6 w-10 bg-neutral-200 rounded-full"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-28 bg-neutral-200 rounded"></div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <div className="h-8 w-8 bg-neutral-200 rounded-lg"></div>
          <div className="h-8 w-8 bg-neutral-200 rounded-lg"></div>
          <div className="h-8 w-8 bg-neutral-200 rounded-lg"></div>
        </div>
      </td>
    </tr>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Entreprise
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Secteur
            </th>
            <th className="text-center px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Posts
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Dernière collecte
            </th>
            <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-surface rounded-lg border border-neutral-200 shadow-card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-neutral-200 rounded"></div>
        <div className="w-8 h-8 bg-neutral-200 rounded-lg"></div>
      </div>
      <div className="h-8 w-16 bg-neutral-200 rounded mb-2"></div>
      <div className="h-3 w-32 bg-neutral-100 rounded"></div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden animate-pulse">
      <div className="h-1 bg-neutral-200"></div>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-200"></div>
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-neutral-200 rounded"></div>
            <div className="h-3 w-24 bg-neutral-100 rounded"></div>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 w-full bg-neutral-200 rounded"></div>
          <div className="h-3 w-11/12 bg-neutral-200 rounded"></div>
          <div className="h-3 w-10/12 bg-neutral-200 rounded"></div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-24 bg-neutral-200 rounded-full"></div>
          <div className="h-6 w-16 bg-neutral-200 rounded-full"></div>
          <div className="h-6 w-20 bg-neutral-200 rounded-full"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 bg-neutral-200 rounded"></div>
          <div className="h-4 w-16 bg-neutral-200 rounded"></div>
          <div className="h-4 w-14 bg-neutral-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
