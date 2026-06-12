import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SettingsIcon from '../assets/icons/settings.png';

interface NavMenuProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  session: boolean;
  onProfile: () => void;
  onBlocks: () => void;
  onSettings: () => void;
}

const NavMenu = ({ anchorRef, isOpen, onClose, session, onProfile, onBlocks, onSettings }: NavMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
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
    right: window.innerWidth - rect.right,
  };

  return createPortal(
    <div ref={menuRef} className="nav-menu" style={style}>
      <button className="nav-menu-item" onMouseDown={(e) => { e.stopPropagation(); onProfile(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {session ? 'Profile' : 'Sign in'}
      </button>
      <button className="nav-menu-item" onMouseDown={(e) => { e.stopPropagation(); onBlocks(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M6.34 6.34L17.66 17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Blocks
      </button>
      <button className="nav-menu-item" onMouseDown={(e) => { e.stopPropagation(); onSettings(); onClose(); }}>
        <img src={SettingsIcon} alt="" />
        Settings
      </button>
    </div>,
    document.body
  );
};

export default NavMenu;
