import type { Profile, ProfileInsert, ProfileUpdate } from './user'
import type { Article, ArticleInsert, ArticleUpdate } from './article'
import type { Comment, CommentInsert, CommentUpdate } from './comment'
import type { ArticleChunk, ArticleChunkInsert } from './embedding'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Descriptor mínimo de relación FK — compatible con GenericRelationship de Supabase
type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Like {
  id: string
  article_id: string
  user_id: string
  created_at: string
}

export interface View {
  id: string
  article_id: string
  user_id: string
  viewed_at: string
}

export interface Favorite {
  id: string
  article_id: string
  user_id: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: Rel[]
      }
      articles: {
        Row: Article
        Insert: ArticleInsert
        Update: ArticleUpdate
        Relationships: [
          {
            foreignKeyName: 'articles_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: Comment
        Insert: CommentInsert
        Update: CommentUpdate
        Relationships: [
          {
            foreignKeyName: 'comments_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      likes: {
        Row: Like
        Insert: Omit<Like, 'id' | 'created_at'>
        Update: never
        Relationships: [
          {
            foreignKeyName: 'likes_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      views: {
        Row: View
        Insert: Omit<View, 'id' | 'viewed_at'>
        Update: never
        Relationships: [
          {
            foreignKeyName: 'views_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'views_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      favorites: {
        Row: Favorite
        Insert: Omit<Favorite, 'id' | 'created_at'>
        Update: never
        Relationships: [
          {
            foreignKeyName: 'favorites_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      article_chunks: {
        Row: ArticleChunk
        Insert: ArticleChunkInsert
        Update: never
        Relationships: [
          {
            foreignKeyName: 'article_chunks_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      match_article_chunks: {
        Args: {
          query_embedding: number[]
          match_count?: number
          match_threshold?: number
        }
        Returns: {
          chunk_id: string
          article_id: string
          article_title: string
          chunk_index: number
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      user_role: 'reader' | 'writer' | 'admin'
    }
  }
}
