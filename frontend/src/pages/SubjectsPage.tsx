import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Plus, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Subject } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'
import { Input } from '../components/ui/Input'

interface SubjectFormData {
  name: string
  shortName: string
  color: string
  description: string
}

const COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
]

export function SubjectsPage() {
  const { currentGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '', shortName: '', color: '#3B82F6', description: ''
  })

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const fetchData = async () => {
    if (!currentGroup) return
    setLoading(true)
    try {
      const res = await api.get(`/subjects?groupId=${currentGroup.id}`)
      if (res.data.success) setSubjects(res.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.shortName.trim()) return
    try {
      if (editingSubject) {
        await api.patch(`/subjects/${editingSubject.id}`, formData)
        toastSuccess('Обновлено')
      } else {
        await api.post('/subjects', { ...formData, groupId: currentGroup!.id })
        toastSuccess('Добавлено')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleDelete = async (s: Subject) => {
    if (!confirm(`Удалить предмет?`)) return
    try { await api.delete(`/subjects/${s.id}`); toastSuccess('Удалено'); fetchData() }
    catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const openCreate = () => {
    setEditingSubject(null)
    setFormData({ name: '', shortName: '', color: '#3B82F6', description: '' })
    setModalOpen(true)
  }
  const openEdit = (s: Subject) => {
    setEditingSubject(s)
    setFormData({ name: s.name, shortName: s.shortName, color: s.color, description: s.description || '' })
    setModalOpen(true)
  }

  if (groupLoading || loading) return <LoadingScreen text="Загрузка..." className="flex-1" />
  if (!currentGroup) return <div className="flex-1 flex items-center justify-center text-text-muted">Выберите группу</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-h1">Предметы</h1><p className="text-text-muted">Учебные предметы группы</p></div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить предмет</Button>}
      </div>

      {subjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 card">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-h3 mb-2">Предметов пока нет</h3>
            <p className="text-text-muted mb-6">Добавьте первый предмет</p>
            {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить</Button>}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map(s => (
              <div key={s.id} className="card p-4 hover:shadow-card-hover transition-shadow" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-h4 font-semibold">{s.name}</h3>
                  <Badge variant="neutral" size="sm">{s.shortName}</Badge>
                </div>
                <p className="text-body-sm text-text-muted mb-3">{s.description || 'Без описания'}</p>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }}></span>
                  <span className="text-body-sm text-text-muted">#{s.color.replace('#', '')}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-4 pt-2 border-t">
                    <button onClick={() => openEdit(s)} className="flex-1 py-2 px-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">Редактировать</button>
                    <button onClick={() => handleDelete(s)} className="flex-1 py-2 px-3 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors">Удалить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSubject ? 'Редактировать предмет' : 'Новый предмет'} size="md">
        <div className="space-y-4">
          <Input label="Название" placeholder="Математика" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
          <Input label="Краткое название" placeholder="Мат" value={formData.shortName} onChange={e => setFormData(prev => ({ ...prev, shortName: e.target.value }))} required maxLength={10} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                  className={clsx('w-8 h-8 rounded-full border-2 transition-transform', formData.color === c ? 'scale-110 border-primary' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Описание</label>
<textarea className="w-full px-4 py-2.5 rounded-input bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" rows={3} placeholder="Описание предмета..." value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit}>{editingSubject ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SubjectsPage