import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { Group, GroupExtended, GroupMember, ApiResponse } from '@student-bot/shared'
import { api } from '../api/client'
import { useAuth } from './useAuth'

interface GroupContextType {
  groups: GroupExtended[]
  currentGroup: GroupExtended | null
  currentMembership: GroupMember | null
  loading: boolean
  error: string | null
  fetchGroups: () => Promise<void>
  selectGroup: (groupId: string) => Promise<void>
  createGroup: (data: CreateGroupData) => Promise<Group>
  clearCurrentGroup: () => void
}

interface CreateGroupData {
  name: string
  code: string
  description?: string
}

const GroupContext = createContext<GroupContextType | null>(null)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<GroupContextType['groups']>([])
  const [currentGroup, setCurrentGroup] = useState<GroupContextType['currentGroup']>(null)
  const [currentMembership, setCurrentMembership] = useState<GroupMember | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ApiResponse<GroupContextType['groups']>>('/groups')
      if (res.data.success && res.data.data) {
        setGroups(res.data.data)
        // Restore selected group
        const savedGroupId = localStorage.getItem('selected_group')
        if (savedGroupId) {
          const group = res.data.data.find((g: GroupContextType['groups'][0]) => g.id === savedGroupId)
          if (group) {
            await selectGroup(group.id)
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }, [user])

  const selectGroup = async (groupId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ApiResponse<Group & { myRole: string }>>(`/groups/${groupId}`)
      if (res.data.success && res.data.data) {
        const group = res.data.data
        setCurrentGroup(group)
        setCurrentMembership({
          id: '',
          userId: user!.id,
          groupId: group.id,
          role: group.myRole as any,
          joinedAt: new Date().toISOString(),
          isActive: true,
        })
        localStorage.setItem('selected_group', groupId)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to select group')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async (data: CreateGroupData) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<ApiResponse<Group>>('/groups', data)
      if (res.data.success && res.data.data) {
        await fetchGroups()
        return res.data.data
      }
      throw new Error(res.data.error || 'Failed to create group')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearCurrentGroup = () => {
    setCurrentGroup(null)
    setCurrentMembership(null)
    localStorage.removeItem('selected_group')
  }

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return (
    <GroupContext.Provider
      value={{ groups, currentGroup, currentMembership, loading, error, fetchGroups, selectGroup, createGroup, clearCurrentGroup }}
    >
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroup must be used within GroupProvider')
  }
  return context
}