import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Button } from '../components/ui/Button'
import { Badge, AttendanceBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { ArrowLeft, Edit2, Trash2, Download, UserPlus, Calendar, Clock, MapPin, FileText, Users, ChevronLeft, ChevronRight, Plus, Save, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useToast } from '../components/ui/Toast'
import { Input, Select, Textarea } from '../components/ui/Input'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Pair, Attendance } from '@student-bot/shared'

const PAIR_TYPES = [
  { value: 'LECTURE', label: 'Лекция' },
  { value: 'PRACTICE', label: 'Практика' },
  { value: 'LAB', label: 'Лабораторная' },
  { value: 'EXAM', label: 'Экзамен/Зачёт' },
  { value: 'CONSULTATION', label: 'Консультация' },
]

export function PairPage() {
  const { pairId } = useParams<{ pairId: string }>()
  const navigate = useNavigate()
  const { error: toastError, success: toastSuccess } = useToast()
  const [pair, setPair] = useState<Pair | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    type: 'LECTURE',
    date: '',
    startTime: '',
    endTime: '',
    room: '',
    description: '',
  })
  const [subjects, setSubjects] = useState<any[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchData = async () => {
    if (!pairId) return
    setLoading(true)
    try {
      const pairRes = await api.get(`/pairs/${pairId}`)
      if (!pairRes.data.success) return
      const pairData = pairRes.data.data
      setPair(pairData)
      setIsAdmin(['SUPER_ADMIN', 'ADMIN'].includes(pairData.myRole))

      const groupId = pairData.groupId
      const [subjRes, attRes, studRes] = await Promise.all([
        api.get(`/subjects?groupId=${groupId}`),
        api.get(`/attendance/pair/${pairId}`),
        api.get(`/users/search?groupId=${groupId}&q=`),
      ])
      if (subjRes.data.success) setSubjects(subjRes.data.data)
      if (attRes.data.success) setAttendances(attRes.data.data.students || [])
      if (studRes.data.success) setStudents(studRes.data.data.filter((s: any) => s.role === 'STUDENT'))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!pairId || !formData.title.trim() || !formData.date || !formData.startTime || !formData.endTime) return
    try {
      await api.patch(`/pairs/${pairId}`, formData)
      toastSuccess('Пара обновлена')
      setEditModalOpen(false)
      fetchData()
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить эту пару?')) return
    try {
      await api.delete(`/pairs/${pairId}`)
      toastSuccess('Пара удалена')
      navigate('/')
    } catch (err: any) { toastError(err.response?.data?.error || 'Ошибка') }
  }

  useEffect(() => {
    fetchData()
  }, [pairId])

  if (loading) return <LoadingScreen text="Загрузка пары..." className="flex-1" />
  if (!pair) return <div className="flex-1 flex items-center justify-center text-text-muted">Пара не найдена</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Назад"><ChevronLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-h1">{pair.title}</h1>
          <p className="text-text-muted">
            {format(new Date(pair.date), 'EEEE, d MMMM yyyy', { locale: ru })} •
            {pair.startTime}–{pair.endTime} {pair.room ? `• 📍 ${pair.room}` : ''}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setFormData({ subjectId: pair.subjectId, title: pair.title, type: pair.type, date: pair.date.slice(0, 10), startTime: pair.startTime, endTime: pair.endTime, room: pair.room || '', description: pair.description || '' }); setEditModalOpen(true) }}><Edit2 className="w-4 h-4 mr-2" /> Редактировать</Button>
            <Button variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Pair Info */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-h4 mb-3">Информация</h3>
              <div className="space-y-3">
                <InfoRow icon={Calendar} label="Дата" value={format(new Date(pair.date), 'd MMMM yyyy', { locale: ru })} />
                <InfoRow icon={Clock} label="Время" value={`${pair.startTime} – ${pair.endTime}`} />
                {pair.room && <InfoRow icon={MapPin} label="Аудитория" value={pair.room} />}
                <InfoRow icon={FileText} label="Тип" value={PAIR_TYPES.find(t => t.value === pair.type)?.label || pair.type} />
                {pair.subject && <InfoRow icon={FileText} label="Предмет" value={pair.subject.name} />}
              </div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-h4 mb-3">Описание</h3>
              <p className="text-text-secondary whitespace-pre-wrap">{pair.description || 'Описание отсутствует'}</p>
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h4">Посещаемость</h3>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setAttendances(prev => students.map(s => ({ ...s, attendance: { status: 'PRESENT' as const } })))}><Plus className="w-4 h-4 mr-2" /> Все присутствуют</Button>
            )}
          </div>
          {attendances.length === 0 ? (
            <p className="text-text-muted text-center py-8">Нет данных о посещаемости</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Статус</th>
                    <th>Время отметки</th>
                    <th>Кто отметил</th>
                    {isAdmin && <th>Действие</th>}
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((a: any) => (
                    <tr key={a.user.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">{a.user.firstName[0]}{a.user.lastName[0]}</span>
                          <span>{a.user.lastName} {a.user.firstName} {a.user.middleName || ''}</span>
                        </div>
                      </td>
                      <td><AttendanceBadge status={a.attendance?.status || 'PENDING'} /></td>
                      <td className="text-body-sm text-text-muted">{a.attendance?.markedAt ? format(new Date(a.attendance.markedAt), 'HH:mm', { locale: ru }) : '—'}</td>
                      <td className="text-body-sm text-text-muted">{a.attendance?.markedBy ? 'Админ' : 'Сам'}</td>
                      {isAdmin && (
                        <td>
                          <select value={a.attendance?.status || 'PENDING'} onChange={e => updateAttendance(a.user.id, e.target.value as any)} className="input py-1.5 px-2 text-body-sm">
                            <option value="PENDING">Не ответил</option>
                            <option value="PRESENT">Присутствует</option>
                            <option value="LATE">Опоздал</option>
                            <option value="ABSENT">Отсутствует</option>
                            <option value="EXCUSED">Уважительная</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Homeworks for this pair */}
        {pair.homeworks && pair.homeworks.length > 0 && (
          <div className="card p-6">
            <h3 className="text-h4 mb-4">Домашние задания к паре</h3>
            <div className="space-y-3">
              {pair.homeworks.map((hw: any) => (
                <div key={hw.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{hw.title}</p>
                      <p className="text-body-sm text-text-muted">Дедлайн: {format(new Date(hw.deadline), 'dd.MM HH:mm', { locale: ru })} • Макс: {hw.maxScore}</p>
                    </div>
                  </div>
                  <HomeworkStatusBadge status={hw.mySubmission?.status || 'PENDING'} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grades for this pair */}
        {(pair as any).grades && (pair as any).grades.length > 0 && (
          <div className="card p-6">
            <h3 className="text-h4 mb-4">Оценки за пару</h3>
            <div className="space-y-3">
              {(pair as any).grades.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral" size="sm">{g.type}</Badge>
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-body-sm text-text-muted">{g.user.lastName} {g.user.firstName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{g.value} / {g.maxValue}</p>
                    <p className="text-body-sm text-text-muted">вес {g.weight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Редактировать пару" size="lg">
        <div className="space-y-4">
          <Select label="Предмет" options={subjects.map(s => ({ value: s.id, label: s.name }))} value={formData.subjectId} onChange={e => setFormData(prev => ({ ...prev, subjectId: e.target.value }))} required />
          <Input label="Название" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          <Select label="Тип" options={PAIR_TYPES} value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Дата" type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} required />
            <Input label="Аудитория" placeholder="301" value={formData.room} onChange={e => setFormData(prev => ({ ...prev, room: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Начало" type="time" value={formData.startTime} onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))} required />
            <Input label="Конец" type="time" value={formData.endTime} onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))} required />
          </div>
          <Textarea label="Описание" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2"><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Отмена</Button><Button onClick={handleSubmit}>Сохранить</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-text-muted" />
      <div>
        <p className="text-caption text-text-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function HomeworkStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
    PENDING: { label: 'Не сдана', variant: 'neutral' },
    SUBMITTED: { label: 'Сдана', variant: 'primary' },
    CHECKED: { label: 'Проверяется', variant: 'warning' },
    ACCEPTED: { label: 'Зачтено', variant: 'success' },
    REJECTED: { label: 'Не зачтено', variant: 'danger' },
    LATE: { label: 'С опозданием', variant: 'warning' },
  }
  const cfg = config[status] || config.PENDING
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}

function updateAttendance(userId: string, status: string) {
  console.log('Update attendance:', userId, status)
}

export default PairPage
