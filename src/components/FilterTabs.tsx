import type { LineStatusFilter } from '../types/khaja'

interface FilterTabsProps {
  active: LineStatusFilter
  onChange: (filter: LineStatusFilter) => void
  counts?: Partial<Record<LineStatusFilter, number>>
}

const TABS: { value: LineStatusFilter; label: string }[] = [
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'All', label: 'All' },
]

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            active === tab.value
              ? 'bg-white text-khaja-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {counts && (
            <span className="ml-1 text-xs text-gray-400">({counts[tab.value]})</span>
          )}
        </button>
      ))}
    </div>
  )
}
