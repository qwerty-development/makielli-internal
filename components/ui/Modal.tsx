import React, { useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

export interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	children: React.ReactNode
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
	footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	children,
	size = 'md',
	footer,
}) => {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}

		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose()
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isOpen, onClose])

	if (!isOpen) return null

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl',
		xl: 'max-w-6xl',
		full: 'max-w-full mx-4',
	}

	return (
		<div
			className='modal-overlay'
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose()
				}
			}}
		>
			<div className={`modal-content ${sizeClasses[size]}`}>
				{/* Header */}
				{title && (
					<div className='flex items-center justify-between p-6 border-b border-neutral-200'>
						<h2 className='text-2xl font-bold text-neutral-800'>{title}</h2>
						<button
							onClick={onClose}
							className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'
							aria-label='Close modal'
						>
							<FaTimes className='w-5 h-5' />
						</button>
					</div>
				)}

				{/* Content */}
				<div className='p-6'>{children}</div>

				{/* Footer */}
				{footer && (
					<div className='flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50'>
						{footer}
					</div>
				)}
			</div>
		</div>
	)
}
