import { useAuth } from '../hooks/useAuth'
import { useGroup } from '../hooks/useGroup'
import { api } from '../api/client'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { User, Shield, LogOut, Mail, Phone, Camera, Save, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { useToast } from '../components/ui/Toast'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { groups } = useGroup()
  const { error: toastError, success: toastSuccess } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    middleName: user?.middleName || '',
    username: user?.username || '',
    phone: user?.phone || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      if (avatarFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', avatarFile)
        const res = await api.post('/upload', formDataUpload, { headers: { 'Content-Type': 'multipart/form-data' } })
        if (res.data.success) setFormData(prev => ({ ...prev, avatarUrl: res.data.data.url }))
      }
      await api.patch('/users/profile', formData)
      toastSuccess('Профиль обновлен')
      await refreshUser()
      setModalOpen(false)
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  if (!user) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-h1">Профиль</h1>
        <p className="text-text-muted">Личные данные и настройки аккаунта</p>
      </div>

      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full space-y-6">
        {/* Avatar & Basic Info */}
        <div className="card p-6 text-center">
          <div className="relative inline-block mb-4">
            <Avatar
              src={avatarPreview || user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="xl"
            />
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary-hover transition-colors">
              <Camera className="w-5 h-5" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <h2 className="text-h2">{user.firstName} {user.lastName} {user.middleName || ''}</h2>
          <p className="text-text-muted mt-1">@{user.username || 'не задан'}</p>
          <div className="mt-3 inline-block"><RoleBadge role={user.role} /></div>
          <Button variant="secondary" className="mt-4" onClick={() => setModalOpen(true)}>
            <Save className="w-4 h-4 mr-2" />
            Редактировать профиль
          </Button>
        </div>

        {/* Contact Info */}
        <div className="card p-6">
          <h3 className="text-h4 mb-4">Контакты</h3>
          <div className="space-y-3">
            {user.phone && (
              <div className="flex items-center gap-3 p-3 bg-surface rounded-input">
                <Phone className="w-5 h-5 text-text-muted" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.email && (
              <div className="flex items-center gap-3 p-3 bg-surface rounded-input">
                <Mail className="w-5 h-5 text-text-muted" />
                <span>{user.email}</span>
              </div>
            )}
            {!user.phone && !user.email && (
              <p className="text-text-muted text-center py-4">Контакты не указаны</p>
            )}
          </div>
        </div>

        {/* Groups */}
        <div className="card p-6">
          <h3 className="text-h4 mb-4">Мои группы</h3>
          {groups.length === 0 ? (
            <p className="text-text-muted text-center py-4">Вы не состоите ни в одной группе</p>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="font-bold text-primary">{g.code[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-body-sm text-text-muted">Код: {g.code}</p>
                    </div>
                  </div>
                  <RoleBadge role={g.myRole} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Telegram Info */}
        <div className="card p-6">
          <h3 className="text-h4 mb-4">Telegram</h3>
          <div className="space-y-2 text-body-sm">
            <div className="flex justify-between"><span className="text-text-muted">ID</span><span className="font-mono">{user.telegramId}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Роль в системе</span><span><RoleBadge role={user.role} /></span></div>
            <div className="flex justify-between"><span className="text-text-muted">Зарегистрирован</span><span>{format(new Date(user.createdAt), 'dd.MM.yyyy')}</span></div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border-danger/20">
          <h3 className="text-h4 mb-4 text-danger">Опасная зона</h3>
          <Button variant="danger" onClick={() => { if (confirm('Точно выйти?')) window.location.href = '/invite' }}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setFormData({ firstName: user.firstName, lastName: user.lastName, middleName: user.middleName || '', username: user.username || '', phone: user.phone || '', email: user.email || '', avatarUrl: user.avatarUrl || '' }); setAvatarPreview(null); setAvatarFile(null) }} title="Редактировать профиль" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Имя" value={formData.firstName} onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))} required />
            <Input label="Фамилия" value={formData.lastName} onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))} required />
          </div>
          <Input label="Отчество" value={formData.middleName} onChange={e => setFormData(prev => ({ ...prev, middleName: e.target.value }))} />
          <Input label="Username (без @)" value={formData.username} onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))} />
          <Input label="Телефон" type="tel" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button><Button onClick={handleSubmit}>Сохранить</Button></div>
        </div>
      </Modal>
    </div>
  )
}

export default ProfilePage
