import React from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant
	size?: BadgeSize
	icon?: React.ReactNode
	dot?: boolean
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ children, variant = 'neutral', size = 'md', icon, dot, className = '', ...props }, ref) => {
		const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors duration-200'

		const variantClasses = {
			success: 'bg-success-100 text-success-700 border border-success-200',
			warning: 'bg-warning-100 text-warning-700 border border-warning-200',
			error: 'bg-error-100 text-error-700 border border-error-200',
			info: 'bg-info-100 text-info-700 border border-info-200',
			neutral: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
			primary: 'bg-primary-100 text-primary-700 border border-primary-200',
		}

		const sizeClasses = {
			sm: 'px-2 py-0.5 text-xs',
			md: 'px-3 py-1 text-sm',
			lg: 'px-4 py-1.5 text-base',
		}

		const dotColors = {
			success: 'bg-success-500',
			warning: 'bg-warning-500',
			error: 'bg-error-500',
			info: 'bg-info-500',
			neutral: 'bg-neutral-500',
			primary: 'bg-primary-500',
		}

		return (
			<span
				ref={ref}
				className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
				{...props}
			>
				{dot && (
					<span className={`w-2 h-2 rounded-full ${dotColors[variant]} mr-1.5 animate-pulse`} />
				)}
				{icon && <span className='mr-1.5'>{icon}</span>}
				{children}
			</span>
		)
	}
)

Badge.displayName = 'Badge'
