import React from 'react'
import { FaSpinner } from 'react-icons/fa'

export type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'danger'
	| 'warning'
	| 'outline'
	| 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	isLoading?: boolean
	leftIcon?: React.ReactNode
	rightIcon?: React.ReactNode
	fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			children,
			variant = 'primary',
			size = 'md',
			isLoading = false,
			leftIcon,
			rightIcon,
			fullWidth = false,
			className = '',
			disabled,
			...props
		},
		ref
	) => {
		const baseClasses =
			'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

		const variantClasses = {
			primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm hover:shadow-md',
			secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-sm hover:shadow-md',
			success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 shadow-sm hover:shadow-md',
			danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-sm hover:shadow-md',
			warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500 shadow-sm hover:shadow-md',
			outline:
				'border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white focus:ring-primary-500',
			ghost: 'hover:bg-neutral-100 text-neutral-700 focus:ring-neutral-500',
		}

		const sizeClasses = {
			sm: 'px-3 py-1.5 text-sm',
			md: 'px-4 py-2.5 text-base',
			lg: 'px-6 py-3 text-lg',
		}

		const widthClass = fullWidth ? 'w-full' : ''

		return (
			<button
				ref={ref}
				className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
				disabled={disabled || isLoading}
				{...props}
			>
				{isLoading && (
					<FaSpinner className='animate-spin mr-2' />
				)}
				{!isLoading && leftIcon && <span className='mr-2'>{leftIcon}</span>}
				{children}
				{!isLoading && rightIcon && <span className='ml-2'>{rightIcon}</span>}
			</button>
		)
	}
)

Button.displayName = 'Button'
