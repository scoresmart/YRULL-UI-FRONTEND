// Single source of truth for tag colors.
//
// Every class is written out in full because Tailwind scans source text for
// literal class names — building them by interpolation (`bg-${key}-500`) would
// leave them out of the generated stylesheet.

export const TAG_COLORS = [
  { key: 'green', label: 'Green', dot: 'bg-green-500', bar: 'bg-green-500', border: 'border-l-green-500' },
  { key: 'blue', label: 'Blue', dot: 'bg-blue-500', bar: 'bg-blue-500', border: 'border-l-blue-500' },
  { key: 'purple', label: 'Purple', dot: 'bg-purple-500', bar: 'bg-purple-500', border: 'border-l-purple-500' },
  { key: 'orange', label: 'Orange', dot: 'bg-amber-500', bar: 'bg-amber-500', border: 'border-l-amber-500' },
  { key: 'red', label: 'Red', dot: 'bg-red-500', bar: 'bg-red-500', border: 'border-l-red-500' },
  { key: 'gray', label: 'Gray', dot: 'bg-gray-500', bar: 'bg-gray-500', border: 'border-l-gray-500' },
  { key: 'teal', label: 'Teal', dot: 'bg-teal-500', bar: 'bg-teal-500', border: 'border-l-teal-500' },
  { key: 'indigo', label: 'Indigo', dot: 'bg-indigo-500', bar: 'bg-indigo-500', border: 'border-l-indigo-500' },
  { key: 'pink', label: 'Pink', dot: 'bg-pink-500', bar: 'bg-pink-500', border: 'border-l-pink-500' },
  { key: 'lime', label: 'Lime', dot: 'bg-lime-500', bar: 'bg-lime-500', border: 'border-l-lime-500' },
  { key: 'cyan', label: 'Cyan', dot: 'bg-cyan-500', bar: 'bg-cyan-500', border: 'border-l-cyan-500' },
  { key: 'amber', label: 'Amber', dot: 'bg-amber-600', bar: 'bg-amber-600', border: 'border-l-amber-600' },
];

const FALLBACK = {
  key: 'gray',
  label: 'Gray',
  dot: 'bg-gray-400',
  bar: 'bg-gray-400',
  border: 'border-l-gray-300',
};

/** Look up a tag's color classes, falling back to gray for unknown keys. */
export function tagColor(key) {
  return TAG_COLORS.find((c) => c.key === key) ?? FALLBACK;
}
