// Shared constants

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Присутствует',
  ABSENT: 'Отсутствует',
  LATE: 'Опоздал',
  EXCUSED: 'Уважительная',
  PENDING: 'Не ответил',
}

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: '#22C55E',
  ABSENT: '#EF4444',
  LATE: '#F59E0B',
  EXCUSED: '#3B82F6',
  PENDING: '#9CA3AF',
}

export const PAIR_TYPE_LABELS: Record<string, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
  LAB: 'Лабораторная',
  EXAM: 'Экзамен/Зачёт',
  CONSULTATION: 'Консультация',
}

export const PAIR_TYPE_ICONS: Record<string, string> = {
  LECTURE: '📖',
  PRACTICE: '💻',
  LAB: '🔬',
  EXAM: '📝',
  CONSULTATION: '💬',
}

export const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Не сдана',
  SUBMITTED: 'Сдана',
  CHECKED: 'Проверяется',
  ACCEPTED: 'Зачтено',
  REJECTED: 'Не зачтено',
  LATE: 'С опозданием',
}

export const GRADE_TYPE_LABELS: Record<string, string> = {
  HOMEWORK: 'Домашка',
  QUIZ: 'Тест',
  MIDTERM: 'Коллоквиум',
  EXAM: 'Экзамен',
  PROJECT: 'Проект',
  PARTICIPATION: 'Участие',
  BONUS: 'Бонус',
}

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  LECTURE_NOTES: 'Конспект',
  METHODOLOGY: 'Методичка',
  PRESENTATION: 'Презентация',
  VIDEO: 'Видео',
  LINK: 'Ссылка',
  OTHER: 'Прочее',
}

export const MATERIAL_TYPE_ICONS: Record<string, string> = {
  LECTURE_NOTES: '📄',
  METHODOLOGY: '📚',
  PRESENTATION: '📊',
  VIDEO: '🎥',
  LINK: '🔗',
  OTHER: '📎',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Главный админ',
  ADMIN: 'Админ',
  STUDENT: 'Студент',
  PARENT: 'Родитель',
}

export const USER_ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#8B5CF6',
  ADMIN: '#3B82F6',
  STUDENT: '#22C55E',
  PARENT: '#F59E0B',
}

export const NOTIFICATION_TYPES = {
  ATTENDANCE_MISSED: 'attendance_missed',
  HOMEWORK_ASSIGNED: 'homework_assigned',
  HOMEWORK_GRADED: 'homework_graded',
  GRADE_ADDED: 'grade_added',
  PAIR_CREATED: 'pair_created',
  PAIR_CANCELLED: 'pair_cancelled',
  REPORT_CARD_UPLOADED: 'report_card_uploaded',
  PARENT_LINKED: 'parent_linked',
} as const

export const API_BASE_URL = '/api/v1'
export const WS_BASE_URL = '/ws'

export const DATE_FORMATS = {
  SHORT: 'dd.MM.yyyy',
  LONG: 'dd MMMM yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd.MM.yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  SELECTED_GROUP: 'selected_group',
  THEME: 'theme',
  LANGUAGE: 'language',
}

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
}

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ],
}