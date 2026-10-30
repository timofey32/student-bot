import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  ClipboardList,
  Award,
  Settings,
  User,
  Shield,
  ChevronDown,
  Menu,
  X,
  Bell,
  LogOut,
  Plus,
} from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button, IconButton } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useGroup } from '../../hooks/useGroup'
import { useToast } from '../ui/Toast'
import { api } from '../../api/client'

const navigation = [
  { path: '/', label: 'Сегодня', icon: LayoutDashboard, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/subjects', label: 'Предметы', icon: BookOpen, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/materials', label: 'Материалы', icon: FolderOpen, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/homeworks', label: 'Домашка', icon: ClipboardList, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/grades', label: 'Оценки', icon: Award, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/admin', label: 'Админка', icon: Shield, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { path: '/settings', label: 'Настройки', icon: Settings, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
  { path: '/profile', label: 'Профиль', icon: User, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'PARENT'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { currentGroup, groups, selectGroup, clearCurrentGroup } = useGroup()
  const { error: toastError } = useToast()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCode, setNewGroupCode] = useState('')

  // Handle back button on mobile
  useEffect(() => {
    const handleBack = () => {
      if (sidebarOpen) setSidebarOpen(false)
      if (profileMenuOpen) setProfileMenuOpen(false)
      if (groupMenuOpen) setGroupMenuOpen(false)
    }
    window.addEventListener('popstate', handleBack)
    return () => window.removeEventListener('popstate', handleBack)
  }, [sidebarOpen, profileMenuOpen, groupMenuOpen])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return
    try {
      await api.post('/groups', { name: newGroupName, code: newGroupCode.toUpperCase() })
      toastError('Группа создана!', 'success')
      setCreateGroupOpen(false)
      setNewGroupName('')
      setNewGroupCode('')
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка создания группы')
    }
  }

  const handleLogout = () => {
    logout()
    clearCurrentGroup()
    window.location.href = '/invite'
  }

  const filteredNav = navigation.filter(item =>
    user && item.roles.includes(user.role)
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-overlay z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col',
          'transform transition-transform duration-fast ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-h4">Student Bot</span>
          </div>
          <button
            className="lg:hidden p-2 rounded-input hover:bg-surface"
            onClick={() => setSidebarOpen(false)}
            aria-label="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current group selector */}
        {currentGroup && (
          <div className="p-4 border-b border-border">
            <button
              onClick={() => setGroupMenuOpen(!groupMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-input hover:bg-surface transition-colors text-left"
              aria-expanded={groupMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{currentGroup.name}</p>
                  <p className="text-caption text-text-muted">{currentGroup.code}</p>
                </div>
              </div>
              <ChevronDown className={clsx('w-4 h-4 text-text-muted transition-transform', groupMenuOpen && 'rotate-180')} />
            </button>

            {groupMenuOpen && (
              <div className="mt-2 rounded-input bg-surface-elevated border border-border overflow-hidden animate-in">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => { selectGroup(group.id); setGroupMenuOpen(false); }}
                    className={clsx(
                      'w-full px-3 py-2.5 text-left transition-colors flex items-center gap-3',
                      currentGroup.id === group.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: group.color + '20' }}>
                      <span className="text-caption font-medium" style={{ color: group.color }}>
                        {group.shortName}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-caption text-text-muted">{group.code} • {group.myRole}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => { setGroupMenuOpen(false); setCreateGroupOpen(true); }}
                  className="w-full px-3 py-2.5 text-left flex items-center gap-3 text-primary hover:bg-surface transition-colors"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Создать группу</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Основная навигация">
          {filteredNav.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-input transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={clsx('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User info at bottom */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar
              src={user?.avatarUrl}
              name={`${user?.firstName} ${user?.lastName}`}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <Badge variant="neutral" size="sm" className="mt-0.5">
                {user?.role === 'SUPER_ADMIN' ? 'Главный админ' : user?.role === 'ADMIN' ? 'Админ' : user?.role === 'PARENT' ? 'Родитель' : 'Студент'}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-input hover:bg-surface"
              onClick={() => setSidebarOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title */}
            <div className="flex-1 lg:hidden">
              <h1 className="text-h4 font-semibold truncate">
                {filteredNav.find(n => location.pathname === n.path || (n.path !== '/' && location.pathname.startsWith(n.path)))?.label || 'Student Bot'}
              </h1>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <IconButton aria-label="Уведомления">
                <Bell className="w-5 h-5" />
              </IconButton>

              {/* Profile menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-input hover:bg-surface transition-colors"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                >
                  <Avatar
                    src={user?.avatarUrl}
                    name={`${user?.firstName} ${user?.lastName}`}
                    size="sm"
                  />
                  <span className="hidden sm:block font-medium truncate max-w-[150px]">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className={clsx('w-4 h-4 text-text-muted', profileMenuOpen && 'rotate-180')} />
                </button>

                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface-elevated border border-border rounded-card shadow-modal overflow-hidden z-50 animate-in">
                      <NavLink
                        to="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 text-text-secondary hover:bg-surface hover:text-text transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <User className="w-5 h-5" />
                        <span>Профиль</span>
                      </NavLink>
                      <NavLink
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 text-text-secondary hover:bg-surface hover:text-text transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Settings className="w-5 h-5" />
                        <span>Настройки</span>
                      </NavLink>
                      <hr className="border-border my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-danger hover:bg-surface transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Выйти</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <Modal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        title="Создать группу"
        description="Заполните данные для создания новой учебной группы"
        size="md"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Название группы"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            className="input"
            autoFocus
          />
          <input
            type="text"
            placeholder="Код группы (латиницей, 2-20 символов)"
            value={newGroupCode}
            onChange={e => setNewGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            className="input"
            maxLength={20}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCreateGroupOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateGroup}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}