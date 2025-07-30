export type Answer = {
  title: string
  answer: string
}

export type ApplicationData = {
  name: string
  summary: string
  answers: Answer[]
  cvUrl: string
  tags: string[]
  applicationUrl?: string
  scoreChanges?: { [key: string]: number; }
  commentsResponse: any
}
