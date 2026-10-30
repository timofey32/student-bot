// Shared types between backend, frontend, and bot

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT' | 'PARENT'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'PENDING'

export type PairType = 'LECTURE' | 'PRACTICE' | 'LAB' | 'EXAM' | 'CONSULTATION'

export type HomeworkStatus = 'PENDING' | 'SUBMITTED' | 'CHECKED' | 'ACCEPTED' | 'REJECTED' | 'LATE'

export type GradeType = 'HOMEWORK' | 'QUIZ' | 'MIDTERM' | 'EXAM' | 'PROJECT' | 'PARTICIPATION' | 'BONUS'

export type MaterialType = 'LECTURE_NOTES' | 'METHODOLOGY' | 'PRESENTATION' | 'VIDEO' | 'LINK' | 'OTHER'

export interface User {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName: string
  middleName?: string
  avatarUrl?: string
  role: UserRole
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Group {
  id: string
  name: string
  code: string
  description?: string
  inviteToken: string
  isActive: boolean
  color?: string
  shortName?: string
  createdAt: string
  updatedAt: string
}

export interface GroupExtended extends Group {
  myRole?: string
  memberCount?: number
  subjectCount?: number
  pairCount?: number
  _count?: {
    members?: number
    subjects?: number
    pairs?: number
  }
}

export interface GroupMember {
  id: string
  userId: string
  groupId: string
  role: UserRole
  joinedAt: string
  isActive: boolean
  user?: User
}

export interface Subject {
  id: string
  groupId: string
  name: string
  shortName: string
  color: string
  description?: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Pair {
  id: string
  groupId: string
  subjectId: string
  title: string
  type: PairType
  date: string
  startTime: string
  endTime: string
  room?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  subject?: Subject
  attendances?: Attendance[]
  homeworks?: Homework[]
}

export interface Attendance {
  id: string
  pairId: string
  userId: string
  status: AttendanceStatus
  markedAt?: string
  markedBy?: string
  note?: string
  createdAt: string
  updatedAt: string
  pair?: Pair
  user?: User
}

export interface Material {
  id: string
  groupId: string
  subjectId?: string
  title: string
  type: MaterialType
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  externalUrl?: string
  description?: string
  uploadedBy: string
  isPublic: boolean
  order: number
  createdAt: string
  updatedAt: string
  subject?: Subject
}

export interface Homework {
  id: string
  groupId: string
  subjectId: string
  pairId?: string
  title: string
  description?: string
  deadline: string
  maxScore: number
  attachments: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  subject?: Subject
  pair?: Pair
  submissions?: HomeworkSubmission[]
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  userId: string
  status: HomeworkStatus
  content?: string
  attachments: string[]
  score?: number
  feedback?: string
  submittedAt?: string
  checkedAt?: string
  checkedBy?: string
  createdAt: string
  updatedAt: string
  homework?: Homework
  user?: User
}

export interface Grade {
  id: string
  groupId: string
  subjectId: string
  userId: string
  pairId?: string
  type: GradeType
  title: string
  value: number
  maxValue: number
  weight: number
  date: string
  comment?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  subject?: Subject
  user?: User
  pair?: Pair
}

export interface ParentStudent {
  id: string
  parentId: string
  studentId: string
  groupId: string
  createdAt: string
  parent?: User
  student?: User
  group?: Group
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  senderId?: string
  recipientId: string
  groupId?: string
  pairId?: string
  homeworkId?: string
  gradeId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface ReportCard {
  id: string
  groupId: string
  studentId: string
  periodStart: string
  periodEnd: string
  fileUrl: string
  fileName: string
  mimeType: string
  uploadedBy: string
  createdAt: string
}

export interface Settings {
  id: string
  groupId: string
  lateThreshold: number
  autoMarkAbsent: boolean
  notifyParents: boolean
  notifyStudents: boolean
  weekStartsOn: number
  timezone: string
  createdAt: string
  updatedAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// WebApp types
export interface WebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface WebAppInitData {
  user?: WebAppUser
  chat_instance?: string
  chat_type?: string
  start_param?: string
  auth_date: number
  hash: string
}