
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_reactions": {
                  Row: {
                    "activity_id": string,"created_at": string,"emoji": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"created_at"?: string,"emoji": string,"user_id": string
                  }
                  Update: {
                    "activity_id"?: string,"created_at"?: string,"emoji"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_reactions_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "group_activity"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"body_measurements": {
                  Row: {
                    "body_fat_pct": number | null,"chest_cm": number | null,"created_at": string,"hips_cm": number | null,"id": string,"measured_on": string,"note": string | null,"plank_seconds": number | null,"pushups_max": number | null,"resting_hr": number | null,"user_id": string,"vo2max": number | null,"waist_cm": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body_fat_pct"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"hips_cm"?: number | null,"id"?: string,"measured_on": string,"note"?: string | null,"plank_seconds"?: number | null,"pushups_max"?: number | null,"resting_hr"?: number | null,"user_id": string,"vo2max"?: number | null,"waist_cm"?: number | null
                  }
                  Update: {
                    "body_fat_pct"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"hips_cm"?: number | null,"id"?: string,"measured_on"?: string,"note"?: string | null,"plank_seconds"?: number | null,"pushups_max"?: number | null,"resting_hr"?: number | null,"user_id"?: string,"vo2max"?: number | null,"waist_cm"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "body_measurements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"challenge_participants": {
                  Row: {
                    "challenge_id": string,"joined_at": string,"manual_progress": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"joined_at"?: string,"manual_progress"?: number,"user_id": string
                  }
                  Update: {
                    "challenge_id"?: string,"joined_at"?: string,"manual_progress"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenge_participants_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "group_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenge_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_habits": {
                  Row: {
                    "archived": boolean,"created_at": string,"icon": string,"id": string,"key": string | null,"name": string,"sort_order": number,"user_id": string,"visible_to_groups": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"icon"?: string,"id"?: string,"key"?: string | null,"name": string,"sort_order"?: number,"user_id": string,"visible_to_groups"?: boolean
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"icon"?: string,"id"?: string,"key"?: string | null,"name"?: string,"sort_order"?: number,"user_id"?: string,"visible_to_groups"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_habits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"goal_progress_entries": {
                  Row: {
                    "amount": number,"created_at": string,"goal_id": string,"id": string,"logged_on": string,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"goal_id": string,"id"?: string,"logged_on": string,"note"?: string | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"goal_id"?: string,"id"?: string,"logged_on"?: string,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_progress_entries_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "personal_goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_progress_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_activity": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"created_at": string,"group_id": string,"id": string,"kind": string,"payload": NonNullable<Json>,"workout_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"group_id": string,"id"?: string,"kind": string,"payload"?: NonNullable<Json>,"workout_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"group_id"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"workout_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_activity_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_activity_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_activity_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"group_challenges": {
                  Row: {
                    "activity_type": Database["public"]['Enums']["activity_type"] | null,"created_at": string,"created_by": string | null,"description": string | null,"end_date": string,"group_id": string,"habit_key": string | null,"id": string,"metric": Database["public"]['Enums']["challenge_metric"],"scope": Database["public"]['Enums']["challenge_scope"],"start_date": string,"target_value": number,"title": string,"unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"] | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"end_date": string,"group_id": string,"habit_key"?: string | null,"id"?: string,"metric"?: Database["public"]['Enums']["challenge_metric"],"scope"?: Database["public"]['Enums']["challenge_scope"],"start_date": string,"target_value": number,"title": string,"unit"?: string
                  }
                  Update: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"] | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"end_date"?: string,"group_id"?: string,"habit_key"?: string | null,"id"?: string,"metric"?: Database["public"]['Enums']["challenge_metric"],"scope"?: Database["public"]['Enums']["challenge_scope"],"start_date"?: string,"target_value"?: number,"title"?: string,"unit"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_challenges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_challenges_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"group_invites": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"group_id": string,"id": string,"invited_user_id": string | null,"max_uses": number | null,"status": string,"use_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"group_id": string,"id"?: string,"invited_user_id"?: string | null,"max_uses"?: number | null,"status"?: string,"use_count"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"group_id"?: string,"id"?: string,"invited_user_id"?: string | null,"max_uses"?: number | null,"status"?: string,"use_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_invites_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_invites_invited_user_id_fkey"
      columns: ["invited_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "auto_feed_posts": boolean,"color": string,"created_at": string,"created_by": string | null,"description": string | null,"icon": string,"id": string,"member_count": number,"members_can_create_challenges": boolean,"members_can_invite": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_feed_posts"?: boolean,"color"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"member_count"?: number,"members_can_create_challenges"?: boolean,"members_can_invite"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "auto_feed_posts"?: boolean,"color"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"member_count"?: number,"members_can_create_challenges"?: boolean,"members_can_invite"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_completions": {
                  Row: {
                    "completed_on": string,"created_at": string,"habit_id": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_on": string,"created_at"?: string,"habit_id": string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "completed_on"?: string,"created_at"?: string,"habit_id"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_completions_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "daily_habits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"health_notes": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "health_notes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"personal_goals": {
                  Row: {
                    "activity_type": Database["public"]['Enums']["activity_type"] | null,"archived": boolean,"category": Database["public"]['Enums']["goal_category"],"created_at": string,"end_date": string | null,"habit_key": string | null,"id": string,"period": Database["public"]['Enums']["goal_period"],"start_date": string | null,"target_value": number,"title": string,"tracking": Database["public"]['Enums']["goal_tracking"],"unit": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"] | null,"archived"?: boolean,"category"?: Database["public"]['Enums']["goal_category"],"created_at"?: string,"end_date"?: string | null,"habit_key"?: string | null,"id"?: string,"period"?: Database["public"]['Enums']["goal_period"],"start_date"?: string | null,"target_value": number,"title": string,"tracking"?: Database["public"]['Enums']["goal_tracking"],"unit"?: string,"user_id": string
                  }
                  Update: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"] | null,"archived"?: boolean,"category"?: Database["public"]['Enums']["goal_category"],"created_at"?: string,"end_date"?: string | null,"habit_key"?: string | null,"id"?: string,"period"?: Database["public"]['Enums']["goal_period"],"start_date"?: string | null,"target_value"?: number,"title"?: string,"tracking"?: Database["public"]['Enums']["goal_tracking"],"unit"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "personal_goals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_health_profiles": {
                  Row: {
                    "health_goals": string | null,"height_cm": number | null,"starting_weight_kg": number | null,"target_weight_kg": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "health_goals"?: string | null,"height_cm"?: number | null,"starting_weight_kg"?: number | null,"target_weight_kg"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "health_goals"?: string | null,"height_cm"?: number | null,"starting_weight_kg"?: number | null,"target_weight_kg"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_health_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"display_name": string | null,"id": string,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string | null,"id": string,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string | null,"id"?: string,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shared_goals": {
                  Row: {
                    "goal_id": string,"group_id": string,"shared_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "goal_id": string,"group_id": string,"shared_at"?: string,"user_id": string
                  }
                  Update: {
                    "goal_id"?: string,"group_id"?: string,"shared_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shared_goals_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "personal_goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shared_goals_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shared_goals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "default_workout_visibility": Database["public"]['Enums']["workout_visibility"],"length_unit": string,"notify_challenges": boolean,"notify_invites": boolean,"notify_reactions": boolean,"notify_squad_joins": boolean,"share_habits": boolean,"timezone": string,"updated_at": string,"user_id": string,"weight_unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "default_workout_visibility"?: Database["public"]['Enums']["workout_visibility"],"length_unit"?: string,"notify_challenges"?: boolean,"notify_invites"?: boolean,"notify_reactions"?: boolean,"notify_squad_joins"?: boolean,"share_habits"?: boolean,"timezone"?: string,"updated_at"?: string,"user_id": string,"weight_unit"?: string
                  }
                  Update: {
                    "default_workout_visibility"?: Database["public"]['Enums']["workout_visibility"],"length_unit"?: string,"notify_challenges"?: boolean,"notify_invites"?: boolean,"notify_reactions"?: boolean,"notify_squad_joins"?: boolean,"share_habits"?: boolean,"timezone"?: string,"updated_at"?: string,"user_id"?: string,"weight_unit"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"weight_entries": {
                  Row: {
                    "created_at": string,"entry_date": string,"id": string,"note": string | null,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entry_date": string,"id"?: string,"note"?: string | null,"user_id": string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"entry_date"?: string,"id"?: string,"note"?: string | null,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "weight_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "activity_type": Database["public"]['Enums']["activity_type"],"created_at": string,"distance_km": number | null,"duration_min": number,"id": string,"note": string | null,"performed_on": string,"updated_at": string,"user_id": string,"visibility": Database["public"]['Enums']["workout_visibility"],"workout_payload": Json | null
                  }
                  ComputedFields: "workout_payload"
                  Insert: {
                    "activity_type": Database["public"]['Enums']["activity_type"],"created_at"?: string,"distance_km"?: number | null,"duration_min": number,"id"?: string,"note"?: string | null,"performed_on": string,"updated_at"?: string,"user_id": string,"visibility"?: Database["public"]['Enums']["workout_visibility"]
                  }
                  Update: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"],"created_at"?: string,"distance_km"?: number | null,"duration_min"?: number,"id"?: string,"note"?: string | null,"performed_on"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: Database["public"]['Enums']["workout_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_invite":
{ Args: { "p_group": string }; Returns: boolean
                           },
"can_view_goal":
{ Args: { "p_goal": string }; Returns: boolean
                           },
"challenge_board":
{ Args: { "p_challenge": string }; Returns: {
              "avatar_url": string,"display_name": string,"pct": number,"progress": number,"user_id": string,"username": string
            }[]
                           },
"create_group":
{ Args: { "p_color"?: string,"p_description"?: string,"p_icon"?: string,"p_name": string }; Returns: string
                           },
"create_invite_code":
{ Args: { "p_expires_in_days"?: number,"p_group": string,"p_max_uses"?: number }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"display_name_of":
{ Args: { "p_user": string }; Returns: string
                           },
"goal_progress_internal":
{ Args: { "g": Omit<Database["public"]['Tables']["personal_goals"]['Row'], Database["public"]['Tables']["personal_goals"]['ComputedFields']>,"p_today": string }; Returns: number
                           },
"group_awards":
{ Args: { "p_group": string,"p_today": string }; Returns: {
              "avatar_url": string,"award": string,"detail": string,"display_name": string,"user_id": string,"username": string
            }[]
                           },
"group_calendar":
{ Args: { "p_from": string,"p_group": string,"p_to": string }; Returns: {
              "activity_type": Database["public"]['Enums']["activity_type"],"day": string,"duration_min": number,"user_id": string,"username": string
            }[]
                           },
"group_goal_board":
{ Args: { "p_group": string,"p_today": string }; Returns: {
              "avatar_url": string,"category": Database["public"]['Enums']["goal_category"],"display_name": string,"goal_id": string,"pct": number,"period": Database["public"]['Enums']["goal_period"],"period_from": string,"period_to": string,"progress": number,"target_value": number,"title": string,"unit": string,"user_id": string,"username": string
            }[]
                           },
"group_habits_today":
{ Args: { "p_group": string,"p_today": string }; Returns: {
              "avatar_url": string,"display_name": string,"done": number,"habits": Json,"total": number,"user_id": string,"username": string
            }[]
                           },
"group_leaderboard":
{ Args: { "p_group": string,"p_period": string,"p_today": string }; Returns: {
              "active_minutes": number,"avatar_url": string,"display_name": string,"rank": number,"user_id": string,"username": string,"workouts": number
            }[]
                           },
"habit_visible_to_caller":
{ Args: { "p_habit": string }; Returns: boolean
                           },
"invite_user":
{ Args: { "p_group": string,"p_username": string }; Returns: undefined
                           },
"is_group_admin":
{ Args: { "p_group": string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "p_group": string }; Returns: boolean
                           },
"join_group_with_code":
{ Args: { "p_code": string }; Returns: string
                           },
"leave_group":
{ Args: { "p_group": string }; Returns: undefined
                           },
"metric_value":
{ Args: { "p_activity": Database["public"]['Enums']["activity_type"],"p_from": string,"p_groups_only": boolean,"p_habit_key": string,"p_to": string,"p_tracking": string,"p_user": string }; Returns: number
                           },
"my_goals":
{ Args: { "p_today": string }; Returns: {
              "activity_type": Database["public"]['Enums']["activity_type"],"archived": boolean,"category": Database["public"]['Enums']["goal_category"],"end_date": string,"habit_key": string,"id": string,"pct": number,"period": Database["public"]['Enums']["goal_period"],"period_from": string,"period_to": string,"progress": number,"shared_group_ids": (string)[],"start_date": string,"target_value": number,"title": string,"tracking": Database["public"]['Enums']["goal_tracking"],"unit": string
            }[]
                           },
"my_pending_invites":
{ Args: Record<PropertyKey, never>; Returns: {
              "color": string,"created_at": string,"group_id": string,"group_name": string,"icon": string,"invite_id": string,"invited_by": string,"member_count": number
            }[]
                           },
"notify_user":
{ Args: { "p_body": string,"p_kind": string,"p_link": string,"p_pref": string,"p_title": string,"p_user": string }; Returns: undefined
                           },
"period_bounds":
{ Args: { "p_end": string,"p_period": Database["public"]['Enums']["goal_period"],"p_start": string,"p_today": string }; Returns: {
              "from_date": string,"to_date": string
            }[]
                           },
"preview_invite":
{ Args: { "p_code": string }; Returns: {
              "already_member": boolean,"color": string,"description": string,"group_id": string,"icon": string,"member_count": number,"name": string,"reason": string,"valid": boolean
            }[]
                           },
"remove_member":
{ Args: { "p_group": string,"p_user": string }; Returns: undefined
                           },
"respond_to_invite":
{ Args: { "p_accept": boolean,"p_invite": string }; Returns: string
                           },
"revoke_invite":
{ Args: { "p_invite": string }; Returns: undefined
                           },
"shares_group_with":
{ Args: { "p_user": string }; Returns: boolean
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"workout_payload":
{ Args: { "w": Omit<Database["public"]['Tables']["workouts"]['Row'], Database["public"]['Tables']["workouts"]['ComputedFields']> }; Returns: Json
                           }
          }
          Enums: {
            "activity_type": "walking"|"running"|"swimming"|"strength"|"cycling"|"yoga"|"sports"|"other","challenge_metric": "workout_count"|"active_minutes"|"distance_km"|"habit_days"|"manual","challenge_scope": "individual"|"group","goal_category": "workouts"|"running"|"walking"|"swimming"|"cycling"|"strength"|"steps"|"alcohol_free"|"nutrition"|"cooking"|"sleep"|"hydration"|"mindfulness"|"weight"|"other","goal_period": "week"|"month"|"custom","goal_tracking": "manual"|"workout_count"|"distance_km"|"active_minutes"|"habit_days","member_role": "admin"|"member","workout_visibility": "groups"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_type": ["walking", "running", "swimming", "strength", "cycling", "yoga", "sports", "other"],"challenge_metric": ["workout_count", "active_minutes", "distance_km", "habit_days", "manual"],"challenge_scope": ["individual", "group"],"goal_category": ["workouts", "running", "walking", "swimming", "cycling", "strength", "steps", "alcohol_free", "nutrition", "cooking", "sleep", "hydration", "mindfulness", "weight", "other"],"goal_period": ["week", "month", "custom"],"goal_tracking": ["manual", "workout_count", "distance_km", "active_minutes", "habit_days"],"member_role": ["admin", "member"],"workout_visibility": ["groups", "private"]
          }
        }
} as const
