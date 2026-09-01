export type QuestionType = "mcq" | "ordering" | "matching" | "hotspot";

export interface ChoiceDTO {
  id: number;
  label: string;
  body: string;
  // matching only: which side of the board this item belongs on. Never includes
  // pair_key or is_correct/correct_order -- those stay server-side until grading.
  match_group?: "left" | "right";
}

export interface QuestionDTO {
  id: number;
  domain_code: string;
  domain_name: string;
  subtopic: string;
  difficulty: number;
  is_multi: boolean;
  select_n: number;
  type: QuestionType;
  stem: string;
  exhibit: string | null;
  choices: ChoiceDTO[];
}

// What the client posts back, shaped per question type:
// - mcq / hotspot: { selected_labels: string[] }
// - ordering: { ordered_ids: number[] }  (choice ids in the order the user arranged them)
// - matching: { pairs: Record<number, number> }  (left choice id -> right choice id)
export interface DrillAnswerPayload {
  question_id: number;
  selected_labels?: string[];
  ordered_ids?: number[];
  pairs?: Record<number, number>;
}

export interface AnswerResultDTO {
  correct: boolean;
  correct_labels: string[];
  explanation: string;
  next_due_at?: string;
  new_interval_days?: number;
  // ordering/matching: the correct answer shape, for reviewing after submission.
  correct_order?: { id: number; label: string; body: string }[];
  correct_pairs?: { left: { id: number; label: string; body: string }; right: { id: number; label: string; body: string } }[];
}
