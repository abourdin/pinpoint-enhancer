import { useCallback, useEffect, useState } from 'react'

export default function useAsync<T = any>(callback: Function, dependencies: any[] = []) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState()
  const [data, setData] = useState<T>()

  const callbackMemoized = useCallback(() => {
    setLoading(true)
    setError(undefined)
    setData(undefined)

    callback()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, dependencies)

  useEffect(() => {
    callbackMemoized()
  }, [callbackMemoized])

  return { loading, error, data }
}
