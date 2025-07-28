import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaSort } from 'react-icons/fa';

const SearchableSelect: React.FC<{
  options: any[];
  value: any;
  onChange: (value: any) => void;
  placeholder: string;
  required?: boolean;
  label: string;
  idField?: string;
  className?: string;
}> = ({
  options,
  value,
  onChange,
  placeholder,
  required = false,
  label,
  idField = 'id',
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find the selected option name for display
  const selectedOption = options.find(option => option[idField] == value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>


      {/* Search input with dropdown appearance */}
      <div
        className={`flex text-black items-center border ${isFocused ? 'border-blue' : 'border-gray'} rounded bg-white overflow-hidden shadow-sm hover:border-blue cursor-pointer`}
        onClick={() => setIsFocused(true)}
      >
        <div className="text-gray pl-3">
          <FaSearch className="h-4 w-4" />
        </div>
        <input
          id={`search-${label}`}
          type="text"
          placeholder={selectedOption ? selectedOption.name : placeholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="appearance-none w-full py-2 px-3 text-gray leading-tight focus:outline-none bg-white"
        />
        <div className="text-gray pr-3">
          {isFocused ? (
            <FaSort className="h-4 w-4 transform rotate-180" />
          ) : (
            <FaSort className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Dropdown menu */}
      {isFocused && (
        <div className="absolute z-50 text-black mt-1 w-full max-h-60 overflow-auto rounded-md bg-white border border-gray shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option[idField]}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue hover:text-white ${value == option[idField] ? 'bg-blue bg-opacity-20' : ''}`}
                onClick={() => {
                  onChange(option[idField]);
                  setSearchTerm('');
                  setIsFocused(false);
                }}
              >
                {option.name}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-neutral-500 italic">No matching {label.toLowerCase()} found</div>
          )}
        </div>
      )}

      {/* Hidden select for form submission if needed */}
      <select
        required={required}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="sr-only text-black"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option[idField]} value={option[idField]}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchableSelect;