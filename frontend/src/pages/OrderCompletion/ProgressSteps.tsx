import { card } from './parts';

// Status -> step. Step 2 is the seller's turn in both payment paths: confirm a manual payment and ship
// (pending_confirmation), or ship after the gateway recorded the payment (pending_delivery).
const STATUS_STEPS: Record<string, number> = {
  pending_payment: 1,
  pending_confirmation: 2,
  pending_delivery: 2,
  pending_receipt: 3,
  pending_review: 4,
  completed: 5,
};

const STEP_LABELS = ['Payment', 'Shipping', 'Receipt', 'Reviews'];

export default function ProgressSteps({ status }: { status: string }) {
  const currentStep = STATUS_STEPS[status] || 1;
  return (
    <div className={`${card} mb-6`}>
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={label} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 z-20 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    isCompleted ? 'bg-(--success) text-(--on-ink)' : isCurrent ? 'bg-(--ink) text-(--on-ink)' : 'bg-(--surface-sunken) text-(--muted)'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5 z-20" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : stepNum}
                </div>
                <span className={`mt-2 text-sm font-medium ${isCurrent ? 'text-(--brand)' : 'text-(--text-muted)'}`}>{label}</span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-0.5 z-10 ${stepNum < currentStep ? 'bg-(--success)' : 'bg-(--surface-sunken)'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
