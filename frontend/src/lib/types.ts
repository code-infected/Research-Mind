export interface ToolCall {
  id: string;
  tool_name: 'web_search' | 'web_reader' | 'summarizer' | 'arxiv_search' | 'error' | string;
  status: 'running' | 'done' | 'error';
  inputs?: any;
  result?: any;
  error?: string;
}

export interface TimelineGroupData {
  id: string;
  sub_question: string;
  tool_calls: ToolCall[];
  key_finding?: string;
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}
