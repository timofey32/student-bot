import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Plus, Search, UserPlus, Shield, Mail, MoreVertical } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Group, User, GroupMember, GroupExtended } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'
import { Input } from '../components/ui/Input'

export function GroupPage() {
  const { groups, currentGroup, selectGroup, loading, fetchGroups } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCode, setNewGroupCode] = useState('')

  const handleSearch = async (query: string) => {
    if (query.length < 2) return
    try {
      const res = await api.get(`/users/search?q=${query}&groupId=${currentGroup?.id}`)
      if (res.data.success) setSearchResults(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddMember = async (userId: string, role: 'ADMIN' | 'STUDENT' = 'STUDENT') => {
    if (!currentGroup) return
    try {
      await api.post(`/groups/${currentGroup.id}/members`, { userId, role })
      toastSuccess('Участник добавлен')
      setSearchQuery('')
      setSearchResults([])
      fetchGroups()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return
    try {
      await api.post('/groups', { name: newGroupName, code: newGroupCode.toUpperCase() })
      toastSuccess('Группа создана!')
      setNewGroupName('')
      setNewGroupCode('')
      setInviteModalOpen(false)
      fetchGroups()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleRoleChange = async (member: GroupMember, newRole: 'ADMIN' | 'STUDENT') => {
    try {
      await api.patch(`/groups/${currentGroup?.id}/members/${member.userId}/role`, { role: newRole })
      toastSuccess('Роль обновлена')
      fetchGroups()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleRemoveMember = async (member: GroupMember) => {
    if (!confirm(`Удалить ${member.user.firstName} ${member.user.lastName} из группы?`)) return
    try {
      await api.delete(`/groups/${currentGroup?.id}/members/${member.userId}`)
      toastSuccess('Участник удален')
      fetchGroups()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1">Мои группы</h1>
          <p className="text-text-muted">Управление группами и участниками</p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Создать группу
        </Button>
      </div>

      {loading ? (
        <LoadingScreen text="Загрузка групп..." className="flex-1" />
      ) : groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 card">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <UserPlus className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-h3 mb-2">У вас пока нет групп</h3>
            <p className="text-text-muted mb-6">Создайте новую группу или попросите админа добавить вас по пригласительной ссылке</p>
            <Button onClick={() => setInviteModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать группу
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              isCurrent={currentGroup?.id === group.id}
              onSelect={() => selectGroup(group.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Создать группу" size="md">
        <div className="space-y-4">
          <Input
            label="Название группы"
            placeholder="Группа 123"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            autoFocus
          />
          <Input
            label="Код группы"
            placeholder="GRP123"
            value={newGroupCode}
            onChange={e => setNewGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={20}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateGroup}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GroupCard({ group, isCurrent, onSelect }: { group: GroupExtended; isCurrent: boolean; onSelect: () => void }) {
  return (
    <div
      className={clsx(
        'card p-4 transition-all cursor-pointer',
        isCurrent ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-card-hover'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F620' }}>
            <span className="text-h3 font-bold text-primary">{group.code[0]}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h4 font-semibold">{group.name}</h3>
              {isCurrent && <Badge variant="primary" size="sm">Текущая</Badge>}
              <RoleBadge role={group.myRole || 'STUDENT'} />
            </div>
            <p className="text-body-sm text-text-muted mt-1">Код: {group.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-body-sm text-text-muted">
          <div className="flex items-center gap-1"><Shield className="w-4 h-4" /> {group._count?.members || group.memberCount || 0} чел.</div>
          <div className="flex items-center gap-1"><Mail className="w-4 h-4" /> {group._count?.subjects || group.subjectCount || 0} предмета</div>
        </div>
      </div>
    </div>
  )
}

export default GroupPage
