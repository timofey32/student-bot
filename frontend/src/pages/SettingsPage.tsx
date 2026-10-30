import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { UserPlus, Trash2, Key } from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'
import { useToast } from '../components/ui/Toast'
import { Avatar } from '../components/ui/Avatar'

export function SettingsPage() {
  const { currentGroup, currentMembership, fetchGroups } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [settings, setSettings] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const isAdmin = currentMembership && ['SUPER_ADMIN', 'ADMIN'].includes(currentMembership.role)

  const fetchMembers = async () => {
    if (!currentGroup) return
    try {
      const res = await api.get(`/groups/${currentGroup.id}/members`)
      if (res.data.success) setMembers(res.data.data)
    } catch (err) { console.error(err) }
  }

  const fetchSettings = async () => {
    if (!currentGroup) return
    try {
      const res = await api.get(`/settings?groupId=${currentGroup.id}`)
      if (res.data.success) setSettings(res.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSettingsSave = async () => {
    try {
      await api.patch('/settings', { ...settings, groupId: currentGroup!.id })
      toastSuccess('Настройки сохранены')
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleSearch = async (query: string) => {
    if (query.length < 2) return
    try {
      const res = await api.get(`/users/search?q=${query}&groupId=${currentGroup?.id}`)
      if (res.data.success) setSearchResults(res.data.data.filter((u: any) => u.role === 'STUDENT'))
    } catch (err) { console.error(err) }
  }

  const handleAddMember = async (userId: string, role: 'ADMIN' | 'STUDENT' = 'STUDENT') => {
    try {
      await api.post(`/groups/${currentGroup!.id}/members`, { userId, role })
      toastSuccess('Участник добавлен')
      setSearchQuery('')
      setSearchResults([])
      fetchMembers()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleRoleChange = async (member: any, newRole: 'ADMIN' | 'STUDENT') => {
    try {
      await api.patch(`/groups/${currentGroup!.id}/members/${member.userId}/role`, { role: newRole })
      toastSuccess('Роль обновлена')
      fetchMembers()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleRemoveMember = async (member: any) => {
    if (!confirm(`Удалить ${member.user?.firstName} ${member.user?.lastName}?`)) return
    try {
      await api.delete(`/groups/${currentGroup!.id}/members/${member.userId}`)
      toastSuccess('Удален')
      fetchMembers()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  useEffect(() => {
    fetchSettings()
    fetchMembers()
  }, [currentGroup])

  if (loading) return <div className="flex-1 flex items-center justify-center">Загрузка...</div>
  if (!currentGroup) return <div className="flex-1 flex items-center justify-center text-text-muted">Выберите группу</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-h1">Настройки группы</h1>
        <p className="text-text-muted">{currentGroup.name} ({currentGroup.code})</p>
      </div>

      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
        {/* Group Info */}
        <div className="card p-6">
          <h3 className="text-h4 mb-4">Основные настройки</h3>
          <div className="space-y-4">
            <Input label="Название группы" value={currentGroup.name} onChange={e => { currentGroup.name = e.target.value }} disabled={!isAdmin} />
            <Input label="Код группы" value={currentGroup.code} onChange={e => { currentGroup.code = e.target.value.toUpperCase() }} disabled />
            <Input label="Описание" value={currentGroup.description || ''} onChange={e => { currentGroup.description = e.target.value }} disabled={!isAdmin} />
            {isAdmin && <Button onClick={() => api.patch(`/groups/${currentGroup.id}`, { name: currentGroup.name, description: currentGroup.description }).then(() => toastSuccess('Сохранено'))}>Сохранить изменения</Button>}
          </div>
        </div>

        {/* Group Settings */}
        {settings && (
          <div className="card p-6">
            <h3 className="text-h4 mb-4">Параметры посещаемости и уведомлений</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Порог опоздания (мин)" type="number" value={settings.lateThreshold} onChange={e => setSettings(prev => ({ ...prev, lateThreshold: parseInt(e.target.value) }))} min={0} max={120} />
                <label className="block text-sm font-medium text-text-secondary mb-2">Неделя начинается с</label>
                <select className="w-full px-4 py-2.5 rounded-input bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" value={String(settings.weekStartsOn)} onChange={e => setSettings(prev => ({ ...prev, weekStartsOn: parseInt(e.target.value) }))}>
                  <option value="0">Воскресенье</option>
                  <option value="1">Понедельник</option>
                  <option value="6">Суббота</option>
                </select>
              </div>
              <Input label="Часовой пояс" value={settings.timezone} onChange={e => setSettings(prev => ({ ...prev, timezone: e.target.value }))} />
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Авто-отметка отсутствия</p><p className="text-body-sm text-text-muted">Автоматически ставить «Отсутствует» после окончания пары</p></div>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.autoMarkAbsent} onChange={e => setSettings(prev => ({ ...prev, autoMarkAbsent: e.target.checked }))} className="sr-only peer" /><div className="w-11 h-6 bg-text-muted peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></label>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Уведомления студентам</p><p className="text-body-sm text-text-muted">О новых парах, домашке, оценках</p></div>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.notifyStudents} onChange={e => setSettings(prev => ({ ...prev, notifyStudents: e.target.checked }))} className="sr-only peer" /><div className="w-11 h-6 bg-text-muted peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></label>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Уведомления родителям</p><p className="text-body-sm text-text-muted">О пропусках и оценках детей</p></div>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.notifyParents} onChange={e => setSettings(prev => ({ ...prev, notifyParents: e.target.checked }))} className="sr-only peer" /><div className="w-11 h-6 bg-text-muted peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></label>
              </div>
              {isAdmin && <Button onClick={handleSettingsSave} className="mt-2">Сохранить настройки</Button>}
            </div>
          </div>
        )}

        {/* Members Management */}
        {isAdmin && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h4">Участники ({members.length})</h3>
              <Button onClick={() => setInviteModalOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Добавить</Button>
            </div>
            <div className="space-y-2">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.user?.avatarUrl} name={`${member.user?.firstName} ${member.user?.lastName}`} size="sm" />
                    <div>
                      <p className="font-medium">{member.user?.lastName} {member.user?.firstName} {member.user?.middleName || ''}</p>
                      <p className="text-body-sm text-text-muted">@{member.user?.username || '—'} • {member.user?.telegramId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={member.role} />
                    <select value={member.role} onChange={e => handleRoleChange(member, e.target.value as any)} className="input py-1.5 px-2 text-body-sm" disabled={member.user?.role === 'SUPER_ADMIN'}>
                      <option value="STUDENT">Студент</option>
                      <option value="ADMIN">Админ</option>
                    </select>
                    <button onClick={() => handleRemoveMember(member)} className="p-2 rounded-input hover:bg-surface transition-colors text-danger" aria-label="Удалить"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Link */}
        <div className="card p-6">
          <h3 className="text-h4 mb-4">Пригласительная ссылка</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface rounded-input p-3 font-mono text-body-sm text-text-secondary break-all">
              https://t.me/{import.meta.env.VITE_BOT_USERNAME || 'bot'}?start=invite_{currentGroup.inviteToken}
            </div>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'bot'}?start=invite_${currentGroup.inviteToken}`); toastSuccess('Скопировано!') }}><Key className="w-4 h-4 mr-2" /> Копировать</Button>
            {isAdmin && <Button variant="danger" onClick={async () => { if (confirm('Сгенерировать новую ссылку? Старая перестанет работать.')) { const res = await api.post(`/groups/${currentGroup.id}/invite-token`); if (res.data.success) { currentGroup.inviteToken = res.data.data.inviteToken; toastSuccess('Новая ссылка сгенерирована') } } }}><Key className="w-4 h-4 mr-2" /> Обновить</Button>}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Добавить участника" size="lg">
        <div className="space-y-4">
          <Input label="Поиск пользователя" placeholder="Введите имя или username..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value) }} icon={UserPlus} />
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map(u => (
                <button key={u.id} onClick={() => handleAddMember(u.id)} className="w-full flex items-center gap-3 p-3 bg-surface rounded-input hover:bg-surface-hover transition-colors text-left">
                  <Avatar src={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size="sm" />
                  <div><p className="font-medium">{u.lastName} {u.firstName}</p><p className="text-caption text-text-muted">@{u.username || '—'}</p></div>
                </button>
              ))}
            </div>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setInviteModalOpen(false)}>Закрыть</Button>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsPage
