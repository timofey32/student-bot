import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Shield, Users, Download, Upload, Trash2, Plus, Activity, BarChart3, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { useToast } from '../components/ui/Toast'
import { format } from 'date-fns'

export function AdminPage() {
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'groups' | 'db'>('stats')
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [newGroupData, setNewGroupData] = useState({ name: '', code: '', description: '' })

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, groupsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/groups'),
      ])
      if (statsRes.data.success) setStats(statsRes.data.data)
      if (usersRes.data.success) setUsers(usersRes.data.data)
      if (groupsRes.data.success) setGroups(groupsRes.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleCreateGroup = async () => {
    if (!newGroupData.name.trim() || !newGroupData.code.trim()) return
    try {
      await api.post('/groups', { name: newGroupData.name, code: newGroupData.code.toUpperCase(), description: newGroupData.description })
      toastSuccess('Группа создана')
      setCreateGroupOpen(false)
      setNewGroupData({ name: '', code: '', description: '' })
      fetchStats()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleExport = async () => {
    try {
      const res = await api.get('/admin/export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
    } catch (err) { toastError('Ошибка экспорта') }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post('/admin/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toastSuccess('Импорт завершен')
      fetchStats()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка импорта') }
  }

  if (loading) return <LoadingScreen text="Загрузка админки..." className="flex-1" />

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-h1">Админ-панель</h1>
        <p className="text-text-muted">Управление системой (только для главного админа)</p>
      </div>

      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Пользователей" value={stats.totalUsers} icon={Users} color="primary" />
            <StatCard title="Групп" value={stats.totalGroups} icon={Shield} color="success" />
            <StatCard title="Пар за неделю" value={stats.pairsThisWeek} icon={Activity} color="warning" />
            <StatCard title="Оценок всего" value={stats.totalGrades} icon={BarChart3} color="danger" />
          </div>
        )}

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-border">
            <nav className="flex gap-1 p-1" aria-label="Админ вкладки">
              {(['stats', 'users', 'groups', 'db'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-2 rounded-input text-body-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:bg-surface hover:text-text'
                  )}
                >
                  {tab === 'stats' && '📊 Статистика'}
                  {tab === 'users' && '👥 Пользователи'}
                  {tab === 'groups' && '📚 Группы'}
                  {tab === 'db' && '🗄️ База данных'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {activeTab === 'users' && <UsersTab users={users} />}
            {activeTab === 'groups' && <GroupsTab groups={groups} onCreate={() => setCreateGroupOpen(true)} />}
            {activeTab === 'db' && <DatabaseTab onExport={handleExport} onImport={handleImport} />}
            {activeTab === 'stats' && <StatsDetail stats={stats} />}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal isOpen={createGroupOpen} onClose={() => setCreateGroupOpen(false)} title="Создать группу" size="md">
        <div className="space-y-4">
          <Input label="Название" placeholder="Группа 101" value={newGroupData.name} onChange={e => setNewGroupData(prev => ({ ...prev, name: e.target.value }))} required autoFocus />
          <Input label="Код (латиницей, 2-20)" placeholder="GRP101" value={newGroupData.code} onChange={e => setNewGroupData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} required maxLength={20} />
          <Input label="Описание" placeholder="Описание группы..." value={newGroupData.description} onChange={e => setNewGroupData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2"><Button variant="secondary" onClick={() => setCreateGroupOpen(false)}>Отмена</Button><Button onClick={handleCreateGroup}>Создать</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = { primary: 'text-primary bg-primary/10', success: 'text-success bg-success/10', warning: 'text-warning bg-warning/10', danger: 'text-danger bg-danger/10' }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body-sm text-text-muted">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', colors[color] || colors.primary)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function UsersTab({ users }: { users: any[] }) {
  return (
    <div className="space-y-3">
      {users.map(u => (
        <div key={u.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-medium text-primary">{u.firstName[0]}{u.lastName[0]}</span>
            </div>
            <div>
              <p className="font-medium">{u.lastName} {u.firstName} {u.middleName || ''}</p>
              <p className="text-body-sm text-text-muted">@{u.username || '—'} • {u.telegramId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role={u.role} />
            <Badge variant="neutral" size="sm">{u._count?.groups || 0} групп</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupsTab({ groups, onCreate }: { groups: any[]; onCreate: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-4">
        <Button onClick={onCreate}><Plus className="w-4 h-4 mr-2" /> Создать группу</Button>
      </div>
      {groups.map(g => (
        <div key={g.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="font-bold text-primary">{g.code[0]}</span>
            </div>
            <div>
              <p className="font-medium">{g.name}</p>
              <p className="text-body-sm text-text-muted">Код: {g.code} • {g._count?.members || 0} чел.</p>
            </div>
          </div>
          <Badge variant="neutral" size="sm">{g._count?.subjects || 0} предметов</Badge>
        </div>
      ))}
    </div>
  )
}

function DatabaseTab({ onExport, onImport }: { onExport: () => void; onImport: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-h4 mb-4">Экспорт / Импорт данных</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={onExport}><Download className="w-4 h-4 mr-2" /> Экспорт JSON</Button>
          <div className="flex items-center gap-3">
            <label className="btn btn-secondary cursor-pointer">
              <Upload className="w-4 h-4 mr-2" /> Импорт JSON
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
            <span className="text-body-sm text-text-muted">Полная замена БД. Будьте осторожны!</span>
          </div>
        </div>
      </div>
      <div className="card p-6 border-danger/20">
        <h3 className="text-h4 mb-2 text-danger">Опасные действия</h3>
        <p className="text-text-muted mb-4">Эти действия необратимы. Используйте только при понимании последствий.</p>
        <div className="flex gap-3">
          <Button variant="danger"><Trash2 className="w-4 h-4 mr-2" /> Очистить все данные</Button>
          <Button variant="danger"><RefreshCw className="w-4 h-4 mr-2" /> Сброс миграций</Button>
        </div>
      </div>
    </div>
  )
}

function StatsDetail({ stats }: { stats: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4"><h4 className="font-medium mb-2">Пользователи по ролям</h4><pre className="text-body-sm text-text-muted bg-surface p-3 rounded-input overflow-auto">{JSON.stringify(stats.usersByRole, null, 2)}</pre></div>
        <div className="card p-4"><h4 className="font-medium mb-2">Активность за 7 дней</h4><pre className="text-body-sm text-text-muted bg-surface p-3 rounded-input overflow-auto">{JSON.stringify(stats.activityLast7Days, null, 2)}</pre></div>
      </div>
    </div>
  )
}

export default AdminPage
