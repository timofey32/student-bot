import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge, HomeworkStatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Plus, ClipboardList, Edit2, Trash2, Download, Eye, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Homework } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'
import { Input, Select, Textarea } from '../components/ui/Input'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function HomeworksPage() {
  const { currentGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', subjectId: '', pairId: '', deadline: '', maxScore: 100 })
  const [subjects, setSubjects] = useState<any[]>([])
  const [pairs, setPairs] = useState<any[]>([])

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const fetchData = async () => {
    if (!currentGroup) return
    setLoading(true)
    try {
      const [hwRes, subjRes, pairRes] = await Promise.all([
        api.get(`/homeworks?groupId=${currentGroup.id}`),
        api.get(`/subjects?groupId=${currentGroup.id}`),
        api.get(`/pairs?groupId=${currentGroup.id}&isActive=true`),
      ])
      if (hwRes.data.success) setHomeworks(hwRes.data.data)
      if (subjRes.data.success) setSubjects(subjRes.data.data)
      if (pairRes.data.success) setPairs(pairRes.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.deadline) return
    try {
      if (editingHomework) {
        await api.patch(`/homeworks/${editingHomework.id}`, formData)
        toastSuccess('Обновлено')
      } else {
        await api.post('/homeworks', { ...formData, groupId: currentGroup!.id })
        toastSuccess('Создано')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleDelete = async (hw: Homework) => {
    if (!confirm(`Удалить «${hw.title}»?`)) return
    try { await api.delete(`/homeworks/${hw.id}`); toastSuccess('Удалено'); fetchData() }
    catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const openCreate = () => { setEditingHomework(null); setFormData({ title: '', description: '', subjectId: '', pairId: '', deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16), maxScore: 100 }); setModalOpen(true) }
  const openEdit = (hw: Homework) => { setEditingHomework(hw); setFormData({ title: hw.title, description: hw.description || '', subjectId: hw.subjectId, pairId: hw.pairId || '', deadline: hw.deadline.slice(0, 16), maxScore: hw.maxScore }); setModalOpen(true) }

  if (groupLoading || loading) return <LoadingScreen text="Загрузка..." className="flex-1" />
  if (!currentGroup) return <div className="flex-1 flex items-center justify-center text-text-muted">Выберите группу</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-h1">Домашние задания</h1><p className="text-text-muted">Создание, сдача и проверка</p></div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить задание</Button>}
      </div>
      {homeworks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><div className="text-center p-8 card"><div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center"><ClipboardList className="w-10 h-10 text-text-muted" /></div><h3 className="text-h3 mb-2">Заданий пока нет</h3><p className="text-text-muted mb-6">Создайте первое домашнее задание</p>{isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Создать</Button>}</div></div>
      ) : (
        <div className="flex-1 overflow-y-auto"><div className="space-y-3">{homeworks.map(hw => <HomeworkCard key={hw.id} homework={hw} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />)}</div></div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingHomework ? 'Редактировать' : 'Новое задание'} size="lg">
        <div className="space-y-4">
          <Input label="Тема" placeholder="Упражнения 1-10" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          <Textarea label="Описание" placeholder="Подробное описание..." value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <Select label="Предмет" options={subjects.map(s => ({ value: s.id, label: s.name }))} value={formData.subjectId} onChange={e => setFormData(prev => ({ ...prev, subjectId: e.target.value }))} required />
          <Select label="Пара (необязательно)" options={pairs.map(p => ({ value: p.id, label: `${p.subject?.shortName} ${format(new Date(p.date), 'dd.MM', { locale: ru })} ${p.title}` }))} value={formData.pairId} onChange={e => setFormData(prev => ({ ...prev, pairId: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Дедлайн" type="datetime-local" value={formData.deadline} onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))} required />
            <Input label="Макс. балл" type="number" value={formData.maxScore} onChange={e => setFormData(prev => ({ ...prev, maxScore: parseInt(e.target.value) }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button><Button onClick={handleSubmit}>{editingHomework ? 'Сохранить' : 'Создать'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function HomeworkCard({ homework, isAdmin, onEdit, onDelete }: { homework: Homework & { mySubmission?: { status: string } }; isAdmin: boolean; onEdit: (h: Homework) => void; onDelete: (h: Homework) => void }) {
  const isOverdue = new Date(homework.deadline) < new Date()
  return (
    <div className={clsx('card p-4 hover:shadow-card-hover transition-shadow', isOverdue && 'border-warning/30')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-h4 font-semibold truncate">{homework.title}</h3>
            <HomeworkStatusBadge status={homework.mySubmission?.status || 'PENDING'} />
            {isOverdue && !homework.mySubmission && <Badge variant="warning" size="sm"><AlertTriangle className="w-3 h-3 mr-1" /> Просрочено</Badge>}
          </div>
          <p className="text-body-sm text-text-muted truncate mb-2">{homework.description || 'Без описания'}</p>
          <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-muted">
            <span><Clock className="w-4 h-4 inline mr-1" /> До {format(new Date(homework.deadline), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
            <span>Макс: {homework.maxScore} баллов</span>
            {homework.subject && <span>{homework.subject.name}</span>}
            {homework.pair && <span>Пара: {homework.pair.title}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (<><button onClick={() => onEdit(homework)} className="p-2 rounded-input hover:bg-surface transition-colors" aria-label="Редактировать"><Edit2 className="w-4 h-4 text-text-muted" /></button><button onClick={() => onDelete(homework)} className="p-2 rounded-input hover:bg-surface transition-colors text-danger" aria-label="Удалить"><Trash2 className="w-4 h-4" /></button></>)}
        </div>
      </div>
    </div>
  )
}

export default HomeworksPage
