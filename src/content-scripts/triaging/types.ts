export type Answer = {
  title: string
  answer: string
}

export type Tag = {
  name: string
  id?: number
  editable?: boolean
  context?: string
}

export type ApplicationData = {
  name: string
  summary: string
  answers: Answer[]
  cvUrl: string
  tags: Tag[]
  applicationUrl?: string
  scoreChanges?: { [key: string]: number; }
  comments: any
}
