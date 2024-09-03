import { useUser } from '@clerk/nextjs'

export const checkRoleAdmin = (role: 'admin') => {
	const { user } = useUser()
	return user?.publicMetadata.role === role
}
