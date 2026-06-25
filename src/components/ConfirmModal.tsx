import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} icon={AlertTriangle}>
      <div className="space-y-6">
        <div className="text-zinc-600 leading-relaxed text-sm">
          {message}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button 
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors border border-red-600/20 shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
