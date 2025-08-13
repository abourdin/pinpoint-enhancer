import useAsync from '@common/hooks/useAsync'
import { getApplicationData } from '@src/content-scripts/triaging/api/PinpointAPI'
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { ApplicationData, Tag } from '../types'

interface ApplicationContextType {
  applicationId: string
  applicationUrl: string
  currentUserId: string
  data: ApplicationData
  updateData: (newValues: Partial<ApplicationData>) => void
  loading: boolean
  error: Error | undefined
  rejectCallback: (tag: Tag) => void
}

interface ApplicationContextProviderProps {
  children: ReactNode
  applicationId: string
  applicationUrl: string
  currentUserId: string
  rejectCallback: (tag: Tag) => void
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined)

export const ApplicationContextProvider: React.FC<ApplicationContextProviderProps> = ({
  children,
  applicationId,
  applicationUrl,
  currentUserId,
  rejectCallback,
}) => {
  const [data, setData] = useState<ApplicationData>({} as ApplicationData)

  const { loading, error } = useAsync<ApplicationData>(async () => {
    if (!applicationId) {
      return
    }
    const applicationData = await getApplicationData(applicationId)
    setData(applicationData)
  }, [applicationId])

  const updateData = useCallback((newValues: Partial<ApplicationData>) => {
    setData(data => ({
      ...data,
      ...newValues,
    }))
  }, [setData])

  const rejectCallbackWrapper = (tag: Tag) => {
    rejectCallback(tag)
    updateData({
      tags: [...data.tags, tag],
    })
  }

  return (
    <ApplicationContext.Provider
      value={{ applicationId, applicationUrl, currentUserId, data, updateData, loading, error, rejectCallback: rejectCallbackWrapper }}>
      {children}
    </ApplicationContext.Provider>
  )
}

export const useApplicationContext = () => {
  const context = useContext(ApplicationContext)
  if (context === undefined) {
    throw new Error('useApplicationContext must be used within a ApplicationContextProvider')
  }
  return context
}
