import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TotalDropdownProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  isDateRangeActive: boolean;
  onClose: () => void;
  onKeepOpen: () => void;
  onSelectTotal: () => void;
  onSelectDateRange: () => void;
}

const TotalDropdown = ({
  anchorRef,
  isOpen,
  isDateRangeActive,
  onClose,
  onKeepOpen,
  onSelectTotal,
  onSelectDateRange,
}: TotalDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left,
    minWidth: rect.width,
  };

  return createPortal(
    <div ref={dropdownRef} className="total-dropdown" style={style} onMouseEnter={onKeepOpen} onMouseLeave={onClose}>
      <button
        className={`total-dropdown-item${!isDateRangeActive ? ' active' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onSelectTotal(); }}
      >
        Total
      </button>
      <button
        className={`total-dropdown-item${isDateRangeActive ? ' active' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onSelectDateRange(); }}
      >
        Date Range
      </button>
    </div>,
    document.body
  );
};

export default TotalDropdown;
