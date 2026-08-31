export interface ChoiceDTO {
  id: number;
  label: string;
  body: string;
}

export interface QuestionDTO {
  id: number;
  domain_code: string;
  domain_name: string;
  subtopic: string;
  difficulty: number;
  is_multi: boolean;
  select_n: number;
  stem: string;
  exhibit: string | null;
  choices: ChoiceDTO[];
}

export interface AnswerResultDTO {
  correct: boolean;
  correct_labels: string[];
  explanation: string;
  next_due_at?: string;
  new_interval_days?: number;
}
