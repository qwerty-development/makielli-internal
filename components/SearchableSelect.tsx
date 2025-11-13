import React, { useState, useEffect, useRef } from 'react'
import { FaSearch, FaChevronDown, FaCheck } from 'react-icons/fa'

const SearchableSelect: React.FC<{
	options: any[]
	value: any
	onChange: (value: any) => void
	placeholder: string
	required?: boolean
	label: string
	idField?: string
	className?: string
}> = ({
	options,
	value,
	onChange,
	placeholder,
	required = false,
	label,
	idField = 'id',
	className = '',
}) => {
	const [searchTerm, setSearchTerm] = useState('')
	const [isFocused, setIsFocused] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsFocused(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Filter options based on search term
	const filteredOptions = options.filter((option) =>
		option.name.toLowerCase().includes(searchTerm.toLowerCase())
	)

	// Find the selected option name for display
	const selectedOption = options.find((option) => option[idField] == value)

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			{/* Search input with dropdown appearance */}
			<div
				className={`
					flex items-center
					border-2 rounded-lg bg-white overflow-hidden
					transition-all duration-200 cursor-pointer
					${
						isFocused
							? 'border-primary-500 ring-2 ring-primary-200 shadow-medium'
							: 'border-neutral-300 shadow-soft hover:border-primary-400'
					}
				`}
				onClick={() => setIsFocused(true)}
			>
				<div className='text-neutral-400 pl-3'>
					<FaSearch className='h-4 w-4' />
				</div>
				<input
					id={`search-${label}`}
					type='text'
					placeholder={selectedOption ? selectedOption.name : placeholder}
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					onFocus={() => setIsFocused(true)}
					className='appearance-none w-full py-2.5 px-3 text-neutral-800 leading-tight focus:outline-none bg-white placeholder-neutral-400'
				/>
				<div className='text-neutral-400 pr-3'>
					<FaChevronDown
						className={`h-4 w-4 transition-transform duration-200 ${
							isFocused ? 'transform rotate-180' : ''
						}`}
					/>
				</div>
			</div>

			{/* Dropdown menu */}
			{isFocused && (
				<div className='absolute z-50 mt-2 w-full max-h-60 overflow-auto rounded-lg bg-white border-2 border-neutral-200 shadow-strong animate-slide-down'>
					{filteredOptions.length > 0 ? (
						<div className='py-1'>
							{filteredOptions.map((option) => {
								const isSelected = value == option[idField]
								return (
									<div
										key={option[idField]}
										className={`
											px-4 py-2.5 text-sm cursor-pointer
											flex items-center justify-between
											transition-colors duration-150
											${
												isSelected
													? 'bg-primary-50 text-primary-700'
													: 'text-neutral-800 hover:bg-neutral-50'
											}
										`}
										onClick={() => {
											onChange(option[idField])
											setSearchTerm('')
											setIsFocused(false)
										}}
									>
										<span className='font-medium'>{option.name}</span>
										{isSelected && <FaCheck className='h-4 w-4 text-primary-500' />}
									</div>
								)
							})}
						</div>
					) : (
						<div className='px-4 py-8 text-center'>
							<div className='text-neutral-400 mb-2'>
								<FaSearch className='h-8 w-8 mx-auto' />
							</div>
							<p className='text-sm text-neutral-600'>
								No matching {label.toLowerCase()} found
							</p>
						</div>
					)}
				</div>
			)}

			{/* Hidden select for form submission if needed */}
			<select
				required={required}
				value={value || ''}
				onChange={(e) => onChange(e.target.value)}
				className='sr-only'
			>
				<option value=''>{placeholder}</option>
				{options.map((option) => (
					<option key={option[idField]} value={option[idField]}>
						{option.name}
					</option>
				))}
			</select>
		</div>
	)
}

export default SearchableSelect