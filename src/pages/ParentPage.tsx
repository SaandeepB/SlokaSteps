import { useState } from 'react'
import { ParentGate } from '../components/parent/ParentGate'
import type { GateQuestion } from '../components/parent/ParentGate'
import { ParentDashboard } from '../components/parent/ParentDashboard'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export interface ParentPageProps {
  /** Test seam: fixes the gate question instead of a random pick. */
  fixedGateQuestion?: GateQuestion
}

/**
 * Parent Area. The gate-passed state lives only in component memory — it is
 * intentionally never persisted, so leaving the page closes the gate again.
 */
export function ParentPage({ fixedGateQuestion }: ParentPageProps) {
  const { t } = useTranslation()
  useDocumentTitle(t('parentArea'))
  const [passed, setPassed] = useState(false)

  if (!passed) {
    return (
      <div className="py-6">
        <ParentGate
          onPassed={() => setPassed(true)}
          fixedQuestion={fixedGateQuestion}
        />
      </div>
    )
  }
  return <ParentDashboard />
}
