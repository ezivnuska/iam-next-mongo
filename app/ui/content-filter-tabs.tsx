// app/ui/content-filter-tabs.tsx

'use client';

interface ContentFilterTabsProps {
  selectedFilters: Set<string>;
  onFilterChange: (filters: Set<string>) => void;
}

const filterOptions = [
  { value: 'memory', label: 'Memories' },
  { value: 'post', label: 'Posts' },
];

export default function ContentFilterTabs({ selectedFilters, onFilterChange }: ContentFilterTabsProps) {
  const handleCheckboxChange = (filterValue: string) => {
    const newFilters = new Set(selectedFilters);

    if (newFilters.has(filterValue)) {
      newFilters.delete(filterValue);
    } else {
      newFilters.add(filterValue);
    }

    onFilterChange(newFilters);
  };

  return (
    <div className='flex justify-between gap-4 flex-wrap px-2'>
      {filterOptions.map((option) => (
        <label
          key={option.value}
          className='flex items-center gap-2 cursor-pointer select-none'
        >
          <input
            type='checkbox'
            checked={selectedFilters.has(option.value)}
            onChange={() => handleCheckboxChange(option.value)}
            className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2'
          />
          <span className='text-sm font-medium text-blue-300'>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
