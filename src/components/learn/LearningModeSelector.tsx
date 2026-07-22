import { BookOpen, Library } from 'lucide-react'

export type LearningMode = 'slokas' | 'stories'

export interface LearningModeSelectorProps {
  value: LearningMode
  onChange: (mode: LearningMode) => void
  slokasLabel?: string
  storiesLabel?: string
  label?: string
}

/** Large, keyboard-native segmented control shared by both learning modes. */
export function LearningModeSelector({
  value,
  onChange,
  slokasLabel = 'Slokas',
  storiesLabel = 'Stories',
  label = 'Choose a learning mode',
}: LearningModeSelectorProps) {
  const options: Array<{
    value: LearningMode
    label: string
    icon: typeof BookOpen
  }> = [
    { value: 'slokas', label: slokasLabel, icon: BookOpen },
    { value: 'stories', label: storiesLabel, icon: Library },
  ]

  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-2 rounded-2xl border-2 border-cream-300 bg-white p-1"
    >
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-bold transition-colors ${
              selected
                ? 'bg-teal-600 text-white shadow-soft'
                : 'text-ink-700 hover:bg-cream-100'
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
