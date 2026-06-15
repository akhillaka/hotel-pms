import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  children,
  className = '',
  style = {},
  disabled = false,
  required = false,
  placeholder = 'Select option'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse items from either options prop or children
  let items = options;
  if (children) {
    const childrenArray = React.Children.toArray(children);
    items = childrenArray
      .filter(child => child && child.type === 'option')
      .map(child => ({
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled
      }));
  }

  const selectedItem = items.find(item => String(item.value) === String(value));

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (itemValue) => {
    if (disabled) return;
    onChange({ target: { value: itemValue } });
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', ...style }}
      className={className}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          height: '38px',
          background: disabled ? 'var(--surface-2)' : 'var(--surface)',
          border: '1px solid var(--border-2)',
          color: disabled ? 'var(--text-muted)' : 'var(--text)',
          width: '100%',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {isOpen && !disabled && (
        <div
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 150,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '200px',
            overflowY: 'auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px'
          }}
        >
          {items.map((item, index) => {
            const selected = String(item.value) === String(value);
            return (
              <button
                key={index}
                type="button"
                disabled={item.disabled}
                onClick={() => handleSelect(item.value)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  fontSize: '0.85rem',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  borderRadius: 'var(--r-xs)',
                  background: selected ? 'var(--brand-500)' : 'transparent',
                  color: selected ? '#fff' : item.disabled ? 'var(--text-faint)' : 'var(--text)',
                  fontWeight: selected ? '600' : '400',
                  transition: 'all 0.1s ease',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!selected && !item.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--brand-50)';
                    e.currentTarget.style.color = 'var(--brand-600)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected && !item.disabled) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
