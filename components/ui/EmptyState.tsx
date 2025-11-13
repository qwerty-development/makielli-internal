import React from 'react'
import { Button } from './Button'

export interface EmptyStateProps {
	icon?: React.ReactNode
	title: string
	description?: string
	action?: {
		label: string
		onClick: () => void
		icon?: React.ReactNode
	}
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon,
	title,
	description,
	action,
}) => {
	return (
		<div className='empty-state'>
			{icon && (
				<div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-4'>
					{icon}
				</div>
			)}
			<h3 className='text-xl font-semibold text-neutral-800 mb-2'>{title}</h3>
			{description && (
				<p className='text-neutral-600 mb-6 max-w-md mx-auto'>{description}</p>
			)}
			{action && (
				<Button onClick={action.onClick} leftIcon={action.icon}>
					{action.label}
				</Button>
			)}
		</div>
	)
}
