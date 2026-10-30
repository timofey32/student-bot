import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Plus, Award, Edit2, Trash2, Download, FileSpreadsheet, Calculator } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Grade } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'
import { Input, Select } from '../components/ui/Input'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const GRADE_TYPES = [
  { value: 'HOMEWORK', label: 'Домашка' },
  { value: 'QUIZ', label: 'Тест' },
  { value: 'MIDTERM', label: 'Коллоквиум' },
  { value: 'EXAM', label: 'Экзамен' },
  { value: 'PROJECT', label: 'Проект' },
  { value: 'PARTICIPATION', label: 'Участие' },
  { value: 'BONUS', label: 'Бонус' },
]

export function GradesPage() {
  const { currentGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [grades, setGrades] = useState<Grade[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [formData, setFormData] = useState({ userId: '', subjectId: '', type: 'HOMEWORK', title: '', value: 5, maxValue: 5, weight: 1, date: '', comment: '' })
  const [subjects, setSubjects] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const fetchData = async () => {
    if (!currentGroup) return
    setLoading(true)
    try {
      const [gRes, sumRes, subjRes, studRes] = await Promise.all([
        api.get(`/grades?groupId=${currentGroup.id}`),
        api.get(`/grades/summary?groupId=${currentGroup.id}`),
        api.get(`/subjects?groupId=${currentGroup.id}`),
        api.get(`/users/search?groupId=${currentGroup.id}&q=`),
      ])
      if (gRes.data.success) setGrades(gRes.data.data)
      if (sumRes.data.success) setSummary(sumRes.data.data)
      if (subjRes.data.success) setSubjects(subjRes.data.data)
      if (studRes.data.success) setStudents(studRes.data.data.filter((s: any) => s.role === 'STUDENT'))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!formData.userId || !formData.subjectId || !formData.title.trim()) return
    try {
      if (editingGrade) {
        await api.patch(`/grades/${editingGrade.id}`, formData)
        toastSuccess('Обновлено')
      } else {
        await api.post('/grades', { ...formData, groupId: currentGroup!.id })
        toastSuccess('Добавлено')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleDelete = async (g: Grade) => {
    if (!confirm(`Удалить оценку?`)) return
    try { await api.delete(`/grades/${g.id}`); toastSuccess('Удалено'); fetchData() }
    catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const openCreate = () => { setEditingGrade(null); setFormData({ userId: '', subjectId: '', type: 'HOMEWORK', title: '', value: 5, maxValue: 5, weight: 1, date: new Date().toISOString().slice(0, 16), comment: '' }); setModalOpen(true) }
  const openEdit = (g: Grade) => { setEditingGrade(g); setFormData({ userId: g.userId, subjectId: g.subjectId, type: g.type, title: g.title, value: g.value, maxValue: g.maxValue, weight: g.weight, date: g.date.slice(0, 16), comment: g.comment || '' }); setModalOpen(true) }

  if (groupLoading || loading) return <LoadingScreen text="Загрузка..." className="flex-1" />
  if (!currentGroup) return <div className="flex-1 flex items-center justify-center text-text-muted">Выберите группу</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-h1">Оценки</h1><p className="text-text-muted">Ведомость и средние баллы</p></div>
        <div className="flex gap-2">
          {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить оценку</Button>}
          <Button variant="secondary" onClick={() => api.get('/reports/grades/excel', { responseType: 'blob' }).then(r => { const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'grades.xlsx'; a.click(); })}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</Button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4"><p className="text-text-muted text-body-sm">Общий средний балл</p><p className="text-4xl font-bold text-primary">{summary.overallAverage?.toFixed(2) || '—'}</p></div>
          <div className="card p-4"><p className="text-text-muted text-body-sm">Всего оценок</p><p className="text-4xl font-bold">{summary.totalGrades || 0}</p></div>
          <div className="card p-4"><p className="text-text-muted text-body-sm">Предметов</p><p className="text-4xl font-bold">{summary.bySubject?.length || 0}</p></div>
        </div>
      )}

      {/* By Subject */}
      {summary?.bySubject?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-h3 mb-3">По предметам</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.bySubject.map((s: any) => (
              <div key={s.subject.id} className="card p-4" style={{ borderLeft: `4px solid ${s.subject.color}` }}>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium" style={{ color: s.subject.color }}>{s.subject.name}</p><p className="text-body-sm text-text-muted">{s.count} оценок</p></div>
                  <div className="text-2xl font-bold text-primary">{s.average?.toFixed(2) || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grades list */}
      {grades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><div className="text-center p-8 card"><div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center"><Award className="w-10 h-10 text-text-muted" /></div><h3 className="text-h3 mb-2">Оценок пока нет</h3><p className="text-text-muted mb-6">Добавьте первую оценку</p>{isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить</Button>}</div></div>
      ) : (
        <div className="flex-1 overflow-y-auto"><div className="space-y-3">{grades.map(g => <GradeCard key={g.id} grade={g} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />)}</div></div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingGrade ? 'Редактировать оценку' : 'Новая оценка'} size="md">
        <div className="space-y-4">
          <Select label="Студент" options={students.map(s => ({ value: s.id, label: `${s.lastName} ${s.firstName}` }))} value={formData.userId} onChange={e => setFormData(prev => ({ ...prev, userId: e.target.value }))} required />
          <Select label="Предмет" options={subjects.map(s => ({ value: s.id, label: s.name }))} value={formData.subjectId} onChange={e => setFormData(prev => ({ ...prev, subjectId: e.target.value }))} required />
          <Select label="Тип" options={GRADE_TYPES} value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))} required />
          <Input label="Название" placeholder="Контрольная 1" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Балл" type="number" step="0.1" value={formData.value} onChange={e => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) }))} required />
            <Input label="Макс" type="number" step="0.1" value={formData.maxValue} onChange={e => setFormData(prev => ({ ...prev, maxValue: parseFloat(e.target.value) }))} required />
            <Input label="Вес" type="number" step="0.1" value={formData.weight} onChange={e => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) }))} required />
          </div>
          <Input label="Дата" type="datetime-local" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} required />
          <Input label="Комментарий" placeholder="Примечание..." value={formData.comment} onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button><Button onClick={handleSubmit}>{editingGrade ? 'Сохранить' : 'Добавить'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function GradeCard({ grade, isAdmin, onEdit, onDelete }: { grade: Grade; isAdmin: boolean; onEdit: (g: Grade) => void; onDelete: (g: Grade) => void }) {
  const percentage = ((grade.value / grade.maxValue) * 100).toFixed(0)
  return (
    <div className="card p-4 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-h4 font-semibold truncate">{grade.title}</h3>
            <Badge variant="neutral" size="sm">{GRADE_TYPES.find(t => t.value === grade.type)?.label || grade.type}</Badge>
          </div>
          <p className="text-body-sm text-text-muted">{grade.user?.lastName} {grade.user?.firstName} • {grade.subject?.name}</p>
          <p className="text-caption text-text-muted mt-1">{format(new Date(grade.date), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{grade.value} / {grade.maxValue}</p>
            <p className="text-body-sm text-text-muted">{percentage}% • вес {grade.weight}</p>
          </div>
          {isAdmin && (<><button onClick={() => onEdit(grade)} className="p-2 rounded-input hover:bg-surface transition-colors" aria-label="Редактировать"><Edit2 className="w-4 h-4 text-text-muted" /></button><button onClick={() => onDelete(grade)} className="p-2 rounded-input hover:bg-surface transition-colors text-danger" aria-label="Удалить"><Trash2 className="w-4 h-4" /></button></>)}
        </div>
      </div>
    </div>
  )
}

export default GradesPage
