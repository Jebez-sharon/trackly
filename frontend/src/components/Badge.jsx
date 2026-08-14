// components/Badge.jsx — inside frontend/src/components/
// Colored pill for priority and status values.

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-700',
  no_priority: 'bg-gray-100 text-gray-600',
};

const STATUS_STYLES = {
  new: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'ready-for-test': 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
};

// Picks a colour set based on type, then renders the label.
export default function Badge({ value, type = 'status' }) {
  const styles = type === 'priority' ? PRIORITY_STYLES : STATUS_STYLES;
  const color = styles[value] || 'bg-gray-100 text-gray-600';
  const label = value.replace(/[-_]/g, ' ');

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {label}
    </span>
  );
}