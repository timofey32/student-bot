import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, ChevronRight, Filter, Bell, Download, Calendar } from 'lucide-react'
import { clsx } from 'clsx'
import { useGroup } from '../hooks/useGroup'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'
import { Button, IconButton } from '../components/ui/Button'
import { Badge, AttendanceBadge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Pair, Attendance, User } from '@student-bot/shared'
import { useToast } from '../components/ui/Toast'

interface TodayData {
  pairs: (Pair & {
    subject: { id: string; name: string; shortName: string; color: string }
    myAttendance: Attendance | null
    allAttendances: Attendance[]
    homeworks: { id: string; title: string; deadline: string; maxScore: number }[]
  })[]
  members: User[]
}

export function HomePage() {
  const { currentGroup, currentMembership } = useGroup()
  const { user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState<{ pairId: string; pair: any } | null>(null)

  const fetchData = async () => {
    if (!currentGroup) return
    setLoading(true)
    try {
      const res = await api.get(`/pairs/today?groupId=${currentGroup.id}`)
      if (res.data.success && res.data.data) {
        setData(res.data.data)
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentGroup, selectedDate])

  const isAdmin = currentMembership && ['SUPER_ADMIN', 'ADMIN'].includes(currentMembership.role)

  const handleMarkAttendance = async (pairId: string, status: Attendance['status']) => {
    try {
      await api.post('/attendance/mark', { pairId, status })
      toastSuccess('Статус обновлен')
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleBulkAttendance = async (pairId: string, attendances: { userId: string; status: Attendance['status'] }[]) => {
    try {
      await api.post('/attendance/bulk', { pairId, attendances })
      toastSuccess('Посещаемость отмечена')
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка')
    }
  }

  if (loading) return <LoadingScreen text="Загрузка расписания..." />

  if (!currentGroup) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
            <Filter className="w-10 h-10 text-text-muted" />
          </div>
          <h2 className="text-h2 mb-2">Группа не выбрана</h2>
          <p className="text-text-muted mb-6">Выберите группу в боковом меню или создайте новую</p>
        </div>
      </div>
    )
  }

  const todayPairs = data?.pairs || []
  const members = data?.members || []

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header with date */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Сегодня</h1>
          <p className="text-text-muted">
            {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)))} aria-label="Вчера">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())} className={isToday(selectedDate) ? 'bg-primary/10 text-primary' : ''}>
            Сегодня
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))} aria-label="Завтра">
            <ChevronRight className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button onClick={() => setMarkAttendanceOpen({ pairId: 'new', pair: null })}>
              <Plus className="w-4 h-4" />
              Добавить пару
            </Button>
          )}
        </div>
      </div>

      {/* Pairs list */}
      {todayPairs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 card">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <Calendar className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-h3 mb-2">Пар сегодня нет</h3>
            <p className="text-text-muted">Расписание на этот день пусто</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setMarkAttendanceOpen({ pairId: 'new', pair: null })}>
                <Plus className="w-4 h-4 mr-2" />
                Создать пару
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {todayPairs.map(pair => (
            <PairCard
              key={pair.id}
              pair={pair}
              isAdmin={isAdmin}
              members={members}
              onMarkAttendance={handleMarkAttendance}
              onBulkAttendance={handleBulkAttendance}
              onEdit={isAdmin ? () => setMarkAttendanceOpen({ pairId: pair.id, pair }) : undefined}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <MarkAttendanceModal
        isOpen={!!markAttendanceOpen}
        onClose={() => setMarkAttendanceOpen(null)}
        pair={markAttendanceOpen?.pair}
        members={members}
        isAdmin={isAdmin}
        onMarkAttendance={handleMarkAttendance}
        onBulkAttendance={handleBulkAttendance}
      />
    </div>
  )
}

// Pair Card Component
interface PairCardProps {
  pair: TodayData['pairs'][0]
  isAdmin: boolean
  members: User[]
  onMarkAttendance: (pairId: string, status: Attendance['status']) => void
  onBulkAttendance: (pairId: string, attendances: { userId: string; status: Attendance['status'] }[]) => void
  onEdit?: () => void
}

function PairCard({ pair, isAdmin, members, onMarkAttendance, onBulkAttendance, onEdit }: PairCardProps) {
  const myAttendance = pair.myAttendance
  const isCurrentUserStudent = !isAdmin

  const statusColors = {
    PRESENT: 'bg-success/10 border-success/20',
    ABSENT: 'bg-danger/10 border-danger/20',
    LATE: 'bg-warning/10 border-warning/20',
    EXCUSED: 'bg-primary/10 border-primary/20',
    PENDING: 'bg-text-muted/10 border-border',
  }

  const statusIcons = {
    PRESENT: '✓',
    ABSENT: '✗',
    LATE: '⏱',
    EXCUSED: '✓',
    PENDING: '?',
  }

  return (
    <div className={clsx('card p-4 transition-all', isCurrentUserStudent && myAttendance ? statusColors[myAttendance.status] : '')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pair.subject.color + '20' }}>
              <span className="text-h4 font-bold" style={{ color: pair.subject.color }}>{pair.subject.shortName}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-h4 font-semibold truncate">{pair.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-body-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pair.subject.color }}></span>
                  {pair.subject.name}
                </span>
                <span>{pair.startTime}–{pair.endTime}</span>
                {pair.room && <span>📍 {pair.room}</span>}
                <Badge variant="neutral" size="sm">{pair.type}</Badge>
              </div>
            </div>
          </div>

          {/* Homeworks */}
          {pair.homeworks && pair.homeworks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pair.homeworks.map(hw => (
                <Badge key={hw.id} variant="primary" icon={require('../components/ui/Badge').ClipboardList}>
                  📝 {hw.title} — до {format(new Date(hw.deadline), 'dd.MM HH:mm', { locale: ru })}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Attendance actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCurrentUserStudent && (
            <div className="flex items-center gap-2">
              {myAttendance ? (
                <>
                  <AttendanceBadge status={myAttendance.status} />
                  <Button variant="ghost" size="sm" onClick={() => onMarkAttendance(pair.id, 'PRESENT')}>
                    ✓
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onMarkAttendance(pair.id, 'LATE')}>
                    ⏱
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onMarkAttendance(pair.id, 'ABSENT')}>
                    ✗
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={() => onMarkAttendance(pair.id, 'PRESENT')}>
                  <span className="w-4 h-4 mr-1">✓</span> Я здесь
                </Button>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1">
              <IconButton onClick={() => onBulkAttendance(pair.id, members.map(m => ({ userId: m.id, status: 'PRESENT' })))} aria-label="Все присутствуют" title="Все присутствуют">
                <span className="text-success">✓</span>
              </IconButton>
              <IconButton onClick={() => onBulkAttendance(pair.id, members.map(m => ({ userId: m.id, status: 'ABSENT' })))} aria-label="Все отсутствуют" title="Все отсутствуют">
                <span className="text-danger">✗</span>
              </IconButton>
              {onEdit && <IconButton onClick={onEdit} aria-label="Редактировать пару"><ChevronRight className="w-4 h-4 rotate-90" /></IconButton>}
            </div>
          )}

          {/* Stats for admin */}
          {isAdmin && pair.allAttendances.length > 0 && (
            <div className="flex items-center gap-1 ml-2 text-caption text-text-muted">
              <span className="text-success">✓ {pair.allAttendances.filter(a => a.status === 'PRESENT').length}</span>
              <span className="text-danger">✗ {pair.allAttendances.filter(a => a.status === 'ABSENT').length}</span>
              <span className="text-warning">⏱ {pair.allAttendances.filter(a => a.status === 'LATE').length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mark Attendance Modal
interface MarkAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  pair: any
  members: User[]
  isAdmin: boolean
  onMarkAttendance: (pairId: string, status: Attendance['status']) => void
  onBulkAttendance: (pairId: string, attendances: { userId: string; status: Attendance['status'] }[]) => void
}

function MarkAttendanceModal({ isOpen, onClose, pair, members, isAdmin, onMarkAttendance, onBulkAttendance }: MarkAttendanceModalProps) {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance['status']>>({})

  useEffect(() => {
    if (pair && isAdmin) {
      const initial: Record<string, Attendance['status']> = {}
      members.forEach(m => { initial[m.id] = 'PENDING' })
      setAttendanceMap(initial)
    }
  }, [pair, members, isAdmin])

  const handleStudentMark = (status: Attendance['status']) => {
    if (pair) {
      onMarkAttendance(pair.id, status)
      onClose()
    }
  }

  const handleBulkSave = () => {
    if (pair) {
      const attendances = members.map(m => ({ userId: m.id, status: attendanceMap[m.id] || 'PENDING' }))
      onBulkAttendance(pair.id, attendances)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={pair ? `Отметить: ${pair.title}` : 'Создать пару'} size="lg">
      {isAdmin ? (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-surface rounded-input">
              <div className="flex items-center gap-3">
                <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="sm" />
                <div>
                  <p className="font-medium">{member.lastName} {member.firstName} {member.middleName || ''}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setAttendanceMap(prev => ({ ...prev, [member.id]: status }))}
                    className={clsx(
                      'w-10 h-10 rounded-input transition-all font-medium text-caption',
                      attendanceMap[member.id] === status
                        ? 'bg-primary text-text-inverse shadow-[0_0_0_2px_rgba(59,130,246,0.3)]'
                        : 'bg-surface-elevated text-text-secondary hover:bg-surface'
                    )}
                  >
                    {status === 'PRESENT' && '✓'}
                    {status === 'ABSENT' && '✗'}
                    {status === 'LATE' && '⏱'}
                    {status === 'EXCUSED' && '✓'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button onClick={handleBulkSave}>Сохранить</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-text-secondary">Выберите ваш статус:</p>
          <div className="grid grid-cols-3 gap-3">
            {(['PRESENT', 'LATE', 'ABSENT'] as const).map(status => (
              <button
                key={status}
                onClick={() => handleStudentMark(status)}
                className={clsx(
                  'p-6 rounded-card border-2 transition-all font-medium',
                  status === 'PRESENT' ? 'border-success/30 hover:border-success hover:bg-success/5' :
                  status === 'LATE' ? 'border-warning/30 hover:border-warning hover:bg-warning/5' :
                  'border-danger/30 hover:border-danger hover:bg-danger/5'
                )}
              >
                <div className="text-3xl mb-1">
                  {status === 'PRESENT' && '✓'}
                  {status === 'LATE' && '⏱'}
                  {status === 'ABSENT' && '✗'}
                </div>
                <div className="font-medium">
                  {status === 'PRESENT' && 'Присутствую'}
                  {status === 'LATE' && 'Опоздаю'}
                  {status === 'ABSENT' && 'Отсутствую'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default HomePage
