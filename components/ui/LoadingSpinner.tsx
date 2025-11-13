import React from 'react'
import { FaSpinner } from 'react-icons/fa'

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

export interface LoadingSpinnerProps {
	size?: SpinnerSize
	color?: string
	fullScreen?: boolean
	message?: string
}

const sizeClasses = {
	sm: 'w-4 h-4',
	md: 'w-8 h-8',
	lg: 'w-12 h-12',
	xl: 'w-16 h-16',
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'md',
	color = 'text-primary-500',
	fullScreen = false,
	message,
}) => {
	const spinner = (
		<div className='flex flex-col items-center justify-center gap-3'>
			<FaSpinner className={`${sizeClasses[size]} ${color} animate-spin`} />
			{message && <p className='text-neutral-600 text-sm animate-pulse'>{message}</p>}
		</div>
	)

	if (fullScreen) {
		return (
			<div className='fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center'>
				{spinner}
			</div>
		)
	}

	return spinner
}

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
	return (
		<div
			className={`animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded ${className}`}
			style={{
				backgroundSize: '200% 100%',
				animation: 'shimmer 2s linear infinite',
			}}
		/>
	)
}

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
	rows = 5,
	columns = 4,
}) => {
	return (
		<div className='space-y-3'>
			{/* Header */}
			<div className='grid gap-4' style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
				{Array.from({ length: columns }).map((_, i) => (
					<LoadingSkeleton key={`header-${i}`} className='h-8' />
				))}
			</div>
			{/* Rows */}
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<div
					key={`row-${rowIndex}`}
					className='grid gap-4'
					style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
				>
					{Array.from({ length: columns }).map((_, colIndex) => (
						<LoadingSkeleton key={`cell-${rowIndex}-${colIndex}`} className='h-10' />
					))}
				</div>
			))}
		</div>
	)
}

export const CardSkeleton: React.FC = () => {
	return (
		<div className='card p-6 space-y-4'>
			<LoadingSkeleton className='h-6 w-1/3' />
			<LoadingSkeleton className='h-4 w-full' />
			<LoadingSkeleton className='h-4 w-5/6' />
			<LoadingSkeleton className='h-4 w-4/6' />
		</div>
	)
}
