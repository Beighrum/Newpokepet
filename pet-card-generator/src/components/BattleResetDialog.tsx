import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { RotateCcw, AlertTriangle } from 'lucide-react'

interface BattleResetDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  battleActive: boolean
}

const BattleResetDialog: React.FC<BattleResetDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  battleActive
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-500" />
            {battleActive ? 'Reset Battle?' : 'Start New Battle?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {battleActive ? (
              <>
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Battle in progress!</span>
                </div>
                <p>
                  Are you sure you want to reset the current battle? This will:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>End the current battle immediately</li>
                  <li>Clear all battle progress and log</li>
                  <li>Return you to creature selection</li>
                  <li>Restore all PokePets to full health</li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  This will clear the current battle results and return you to creature selection.
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Clear battle log and results</li>
                  <li>Reset all PokePets to full health</li>
                  <li>Return to creature selection screen</li>
                </ul>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {battleActive ? 'Reset Battle' : 'New Battle'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default BattleResetDialog