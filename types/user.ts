export type UserRole = 'reader' | 'writer' | 'admin'

export interface Profile {
  id: string
  birth_date: string | null
  phone: string | null
  role: UserRole
  created_at: string
}

export type ProfileInsert = Omit<Profile, 'created_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
