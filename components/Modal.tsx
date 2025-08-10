import React, { useState, useEffect } from 'react';

interface ModalAction {
  label: string;
  value: string;
  variant?: 'primary' | 'danger' | 'default';
}

interface ModalOption { value: string; label: string }

interface ModalProps {
  title?: string;
  message: string | React.ReactNode;
  actions: ModalAction[];
  onClose: (value: string | null, payload?: any) => void;
  withInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
  selectOptions?: ModalOption[];
  multiSelect?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ title, message, actions, onClose, withInput, inputLabel, inputPlaceholder, inputDefaultValue, selectOptions, multiSelect }) => {
  const [text, setText] = useState<string>(inputDefaultValue || '');
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { setText(inputDefaultValue || ''); }, [inputDefaultValue]);
  const toggle = (val: string) => {
    setSelected(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {title && <h3 className="modal-title">{title}</h3>}
        <div className="modal-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
          {withInput && (
            <div className="modal-input">
              {inputLabel && <label>{inputLabel}</label>}
              <input
                type="text"
                placeholder={inputPlaceholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
          {selectOptions && selectOptions.length > 0 && (
            <div className="modal-select-list">
              {selectOptions.map(opt => (
                <label key={opt.value} className="modal-select-item">
                  <input type={multiSelect ? 'checkbox' : 'radio'} name="modalSelect"
                         checked={selected.includes(opt.value)}
                         onChange={() => toggle(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="modal-actions">
          {actions.map(a => (
            <button key={a.value} className={`modal-btn ${a.variant || 'default'}`} onClick={() => onClose(a.value, selectOptions ? selected : text)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};



