import { useEffect, useState } from "react"

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const getInitialValue = () => value
  const [debouncedValue, setDebouncedValue] = useState(getInitialValue)

  // Synchronize with the browser timer; cancel on changes and unmount.
  const synchronizeTimer = () => {
    const getValue = () => value
    const publishValue = () => setDebouncedValue(getValue)
    const timeout = setTimeout(publishValue, delayMs)
    const cancel = () => clearTimeout(timeout)
    return cancel
  }
  useEffect(synchronizeTimer, [value, delayMs])

  return debouncedValue
}
