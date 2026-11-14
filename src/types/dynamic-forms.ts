export type FieldType =
  | "text"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "textarea"
  | "image"
  | "gps"
  | "date"
  | "time"
  | "rating";

export interface ConditionalLogic {
  dependsOnId?: number;
  dependsOnCode?: string;
  operator?: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "is_not_empty";
  value?: any;
  equals?: any;
}

export interface FormQuestion {
  id: number;
  template_id: number;
  question_code?: string;
  question_text: string;
  field_type: FieldType;
  is_required: boolean | number;
  options?: string[];
  options_json?: string;
  conditional_logic?: ConditionalLogic | null;
  conditional_logic_json?: string | null;
  step_number: number;
  order_index: number;
  help_text?: string;
  placeholder?: string;
  created_at?: string;
}

export interface FormTemplate {
  id: number;
  code: string;
  title: string;
  description?: string;
  version: number;
  allowed_roles: string;
  department_code?: string;
  status: "active" | "disabled" | "archived";
  created_at?: string;
  updated_at?: string;
  questions?: FormQuestion[];
}

export interface FormAnswer {
  id?: number;
  response_id?: number;
  question_id: number;
  question_code?: string;
  question_text?: string;
  field_type?: FieldType;
  answer_value: string;
  media_data?: string; // Offline Base64 or URL
  gps_lat?: number;
  gps_lng?: number;
  admin_override_value?: string;
  is_hidden_from_field?: boolean | number;
  created_at?: string;
}

export interface FormResponse {
  id: number;
  template_id: number;
  template_title?: string;
  response_number: number;
  user_id: number;
  user_name: string;
  user_role: string;
  location_code?: string;
  location_name?: string;
  department_code: string;
  department_name: string;
  status: "draft" | "pending_assignment" | "assigned" | "pending_review" | "completed" | "rejected";
  case_id?: number;
  curated_notes?: string;
  hidden_questions_json?: string;
  assigned_to_role?: string;
  assigned_to_agent_id?: number;
  assigned_to_agent_name?: string;
  created_at: string;
  updated_at: string;
  field_action_taken?: string;
  field_notes?: string;
  field_media_data?: string;
  field_executed_at?: string;
  answers?: FormAnswer[];
}

export interface CuratedFieldDispatch {
  response_id: number;
  target_agent_id: number;
  target_role: string;
  admin_instructions: string;
  hidden_question_ids: number[];
  field_overrides: Record<number, string>; // question_id -> revised / clarified text
}
