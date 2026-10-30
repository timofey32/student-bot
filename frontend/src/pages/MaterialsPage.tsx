import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Plus, FileText, Eye, Download, Edit2, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Material, MaterialType } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'
import { Input } from '../components/ui/Input'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const MATERIAL_TYPES: MaterialType[] = ['LECTURE_NOTES', 'METHODOLOGY', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']

const TYPE_LABELS: Record<MaterialType, string> = {
  LECTURE_NOTES: 'Конспекты',
  METHODOLOGY: 'Методички',
  PRESENTATION: 'Презентации',
  VIDEO: 'Видео',
  LINK: 'Ссылки',
  OTHER: 'Прочее',
}

const TYPE_ICONS: Record<MaterialType, string> = {
  LECTURE_NOTES: '📄',
  METHODOLOGY: '📚',
  PRESENTATION: '📊',
  VIDEO: '🎥',
  LINK: '🔗',
  OTHER: '📎',
}

interface MaterialFormData {
  title: string
  type: MaterialType
  subjectId: string
  externalUrl: string
  description: string
  file: File | null
}

export function MaterialsPage() {
  const { currentGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState<MaterialFormData>({
    title: '', type: 'OTHER', subjectId: '', externalUrl: '', description: '', file: null
  })
  const [uploading, setUploading] = useState(false)

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const fetchData = async () => {
    if (!currentGroup) return
    setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([
        api.get(`/materials?groupId=${currentGroup.id}`),
        api.get(`/subjects?groupId=${currentGroup.id}`)
      ])
      if (mRes.data.success) setMaterials(mRes.data.data)
      if (sRes.data.success) setSubjects(sRes.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.type || !formData.subjectId) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('title', formData.title)
      form.append('type', formData.type)
      form.append('subjectId', formData.subjectId)
      if (formData.externalUrl) form.append('externalUrl', formData.externalUrl)
      if (formData.description) form.append('description', formData.description)
      if (formData.file) form.append('file', formData.file)

      if (editingMaterial) {
        await api.patch(`/materials/${editingMaterial.id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess('Обновлено')
      } else {
        form.append('groupId', currentGroup!.id)
        await api.post('/materials', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess('Добавлено')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
    finally { setUploading(false) }
  }

  const handleDelete = async (m: Material) => {
    if (!confirm(`Удалить материал?`)) return
    try { await api.delete(`/materials/${m.id}`); toastSuccess('Удалено'); fetchData() }
    catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const openCreate = () => {
    setEditingMaterial(null)
    setFormData({ title: '', type: 'OTHER', subjectId: '', externalUrl: '', description: '', file: null })
    setModalOpen(true)
  }
  const openEdit = (m: Material) => {
    setEditingMaterial(m)
    setFormData({
      title: m.title,
      type: m.type,
      subjectId: m.subjectId || '',
      externalUrl: m.externalUrl || '',
      description: m.description || '',
      file: null
    })
    setModalOpen(true)
  }

  const downloadFile = async (m: Material) => {
    if (!m.fileUrl) return
    try {
      const res = await api.get(m.fileUrl, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = m.fileName || 'file'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toastError('Ошибка скачивания') }
  }

  if (groupLoading || loading) return <LoadingScreen text="Загрузка..." className="flex-1" />
  if (!currentGroup) return <div className="flex-1 flex items-center justify-center text-text-muted">Выберите группу</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-h1">Материалы</h1><p className="text-text-muted">Учебные материалы по предметам</p></div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить материал</Button>}
      </div>

      {materials.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 card">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <FileText className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-h3 mb-2">Материалов пока нет</h3>
            <p className="text-text-muted mb-6">Добавьте первый материал</p>
            {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить</Button>}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {materials.map(m => (
              <div key={m.id} className="card p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{TYPE_ICONS[m.type]}</span>
                      <h3 className="text-h4 font-semibold truncate">{m.title}</h3>
                      <Badge variant="neutral" size="sm">{TYPE_LABELS[m.type]}</Badge>
                    </div>
                    <p className="text-body-sm text-text-muted">
                      {m.subject?.name ? `${m.subject.name} • ` : ''}
                      {format(new Date(m.createdAt), 'dd.MM.yyyy', { locale: ru })}
                    </p>
                    {m.description && <p className="text-body-sm text-text-muted mt-1 line-clamp-2">{m.description}</p>}
                    {m.externalUrl && (
                      <a href={m.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline">
                        <Eye className="w-3 h-3" /> Открыть ссылку
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.fileUrl && (
                      <Button variant="ghost" size="sm" onClick={() => downloadFile(m)}>
                        <Download className="w-4 h-4 mr-1" /> Скачать
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(m)} className="p-2 rounded-input hover:bg-surface transition-colors" aria-label="Редактировать">
                          <Edit2 className="w-4 h-4 text-text-muted" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="p-2 rounded-input hover:bg-surface transition-colors text-danger" aria-label="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingMaterial ? 'Редактировать материал' : 'Новый материал'} size="md">
        <div className="space-y-4">
          <Input label="Название" placeholder="Конспект лекции 1" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          <label className="block text-sm font-medium text-text-secondary mb-2">Тип</label>
          <select className="w-full px-4 py-2.5 rounded-input bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as MaterialType }))} required>
            {MATERIAL_TYPES.map(t => <option key={t} value={t}>{`${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}</option>)}
          </select>
          <label className="block text-sm font-medium text-text-secondary mb-2">Предмет</label>
          <select className="w-full px-4 py-2.5 rounded-input bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" value={formData.subjectId} onChange={e => setFormData(prev => ({ ...prev, subjectId: e.target.value }))} required>
            <option value="">Выберите предмет</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input label="Внешняя ссылка (опционально)" placeholder="https://example.com/file.pdf" value={formData.externalUrl} onChange={e => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))} />
          <label className="block text-sm font-medium text-text-secondary mb-2">Описание</label>
          <textarea className="w-full px-4 py-2.5 rounded-input bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" rows={3} placeholder="Описание материала..." value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Файл</label>
            <input
              type="file"
              onChange={e => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
              className="w-full px-3 py-2 border border-input rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
            />
            {editingMaterial?.fileName && (
              <p className="text-body-sm text-text-muted mt-1">Текущий файл: {editingMaterial.fileName}</p>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={uploading}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={uploading}>{uploading ? 'Загрузка...' : (editingMaterial ? 'Сохранить' : 'Добавить')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default MaterialsPage